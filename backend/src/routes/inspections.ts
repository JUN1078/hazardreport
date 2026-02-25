import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { authenticateToken } from '../middleware/auth';
import { analyzeImage } from '../services/aiService';
import { AuthRequest, Hazard } from '../types';

const router = Router();

// Configure multer storage — use /tmp on Vercel (only writable dir in serverless)
const UPLOADS_DIR = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPG, PNG, GIF, WebP)'));
    }
  },
});

// GET all inspections for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const userId = req.user!.id;
  const { page = '1', limit = '20', risk_level, search } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = 'WHERE i.user_id = ?';
  const params: any[] = [userId];

  if (risk_level && ['Low', 'Medium', 'High', 'Extreme'].includes(risk_level)) {
    whereClause += ' AND i.overall_risk_level = ?';
    params.push(risk_level);
  }

  if (search) {
    whereClause += ' AND (i.project_name LIKE ? OR i.location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM inspections i ${whereClause}`).get(...params) as any).count;

  const inspections = db.prepare(`
    SELECT i.*,
      COUNT(h.id) as hazard_count,
      SUM(CASE WHEN h.risk_level = 'Extreme' THEN 1 ELSE 0 END) as extreme_count,
      SUM(CASE WHEN h.risk_level = 'High' THEN 1 ELSE 0 END) as high_count
    FROM inspections i
    LEFT JOIN hazards h ON h.inspection_id = i.id
    ${whereClause}
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  res.json({ inspections, total, page: pageNum, limit: limitNum });
});

// GET single inspection with hazards
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare(
    'SELECT * FROM inspections WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  const hazards = db.prepare(
    'SELECT * FROM hazards WHERE inspection_id = ? ORDER BY risk_score DESC'
  ).all(id);

  res.json({ inspection, hazards });
});

// POST create new inspection + analyze
router.post('/analyze', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Image file is required' });
    return;
  }

  const { project_name, location, inspection_date, inspector_name, department, notes, latitude, longitude, location_accuracy } = req.body;

  if (!project_name || !inspection_date) {
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'Project name and inspection date are required' });
    return;
  }

  const db = await getDb();
  const userId = req.user!.id;
  const lat = latitude ? parseFloat(latitude) : null;
  const lng = longitude ? parseFloat(longitude) : null;
  const acc = location_accuracy ? parseFloat(location_accuracy) : null;

  // Create inspection record
  const insertResult = db.prepare(`
    INSERT INTO inspections (user_id, project_name, location, inspection_date, inspector_name, department, image_path, image_filename, status, notes, latitude, longitude, location_accuracy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'analyzing', ?, ?, ?, ?)
  `).run(
    userId, project_name, location || null, inspection_date,
    inspector_name || null, department || null,
    req.file.path, req.file.originalname, notes || null,
    lat, lng, acc
  );

  const inspectionId = insertResult.lastInsertRowid as number;

  try {
    // Run AI analysis
    const aiResult = await analyzeImage(req.file.path);

    // Save hazards to DB inside a transaction
    const insertMany = db.transaction((hazards: typeof aiResult.hazards) => {
      for (const h of hazards) {
        db.prepare(`
          INSERT INTO hazards (inspection_id, description, category, hazard_type, severity, likelihood, risk_score, risk_level, engineering_control, administrative_control, ppe_control, immediate_action, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          inspectionId, h.description, h.category, h.hazard_type,
          h.severity, h.likelihood, h.risk_score, h.risk_level,
          h.corrective_actions.engineering, h.corrective_actions.administrative,
          h.corrective_actions.ppe, h.corrective_actions.immediate,
          h.confidence
        );
      }
    });

    insertMany(aiResult.hazards);

    // Update inspection with results
    db.prepare(`
      UPDATE inspections SET status = 'completed', ai_summary = ?, overall_risk_level = ? WHERE id = ?
    `).run(aiResult.summary, aiResult.overall_risk_level, inspectionId);

    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(inspectionId);
    const hazards = db.prepare('SELECT * FROM hazards WHERE inspection_id = ? ORDER BY risk_score DESC').all(inspectionId);

    res.status(201).json({ inspection, hazards, ai_result: aiResult });
  } catch (err: any) {
    db.prepare("UPDATE inspections SET status = 'failed' WHERE id = ?").run(inspectionId);
    console.error('AI analysis error:', err);
    res.status(500).json({
      error: 'AI analysis failed',
      message: err.message,
      inspection_id: inspectionId,
    });
  }
});

// PUT update hazard (manual override)
router.put('/hazards/:hazardId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { hazardId } = req.params;
  const userId = req.user!.id;
  const { description, category, hazard_type, severity, likelihood, engineering_control, administrative_control, ppe_control, immediate_action } = req.body;

  // Verify ownership
  const hazard = db.prepare(`
    SELECT h.* FROM hazards h
    JOIN inspections i ON i.id = h.inspection_id
    WHERE h.id = ? AND i.user_id = ?
  `).get(hazardId, userId) as Hazard | undefined;

  if (!hazard) {
    res.status(404).json({ error: 'Hazard not found' });
    return;
  }

  const newSeverity = severity ? Math.min(5, Math.max(1, parseInt(severity))) : hazard.severity;
  const newLikelihood = likelihood ? Math.min(5, Math.max(1, parseInt(likelihood))) : hazard.likelihood;
  const newRiskScore = newSeverity * newLikelihood;
  let newRiskLevel: string;
  if (newRiskScore <= 5) newRiskLevel = 'Low';
  else if (newRiskScore <= 10) newRiskLevel = 'Medium';
  else if (newRiskScore <= 15) newRiskLevel = 'High';
  else newRiskLevel = 'Extreme';

  db.prepare(`
    UPDATE hazards SET
      description = ?, category = ?, hazard_type = ?,
      severity = ?, likelihood = ?, risk_score = ?, risk_level = ?,
      engineering_control = ?, administrative_control = ?,
      ppe_control = ?, immediate_action = ?
    WHERE id = ?
  `).run(
    description || hazard.description,
    category || hazard.category,
    hazard_type || hazard.hazard_type,
    newSeverity, newLikelihood, newRiskScore, newRiskLevel,
    engineering_control || hazard.engineering_control,
    administrative_control || hazard.administrative_control,
    ppe_control || hazard.ppe_control,
    immediate_action || hazard.immediate_action,
    hazardId
  );

  // Update overall risk level
  const maxRisk = db.prepare(`
    SELECT MAX(risk_score) as max_score FROM hazards WHERE inspection_id = ?
  `).get(hazard.inspection_id) as { max_score: number };

  let overallRisk: string;
  const ms = maxRisk.max_score;
  if (ms <= 5) overallRisk = 'Low';
  else if (ms <= 10) overallRisk = 'Medium';
  else if (ms <= 15) overallRisk = 'High';
  else overallRisk = 'Extreme';

  db.prepare('UPDATE inspections SET overall_risk_level = ? WHERE id = ?')
    .run(overallRisk, hazard.inspection_id);

  const updated = db.prepare('SELECT * FROM hazards WHERE id = ?').get(hazardId);
  res.json(updated);
});

// DELETE inspection
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ? AND user_id = ?').get(id, userId) as any;
  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  // Delete image file
  if (inspection.image_path && fs.existsSync(inspection.image_path)) {
    fs.unlinkSync(inspection.image_path);
  }

  db.prepare('DELETE FROM inspections WHERE id = ?').run(id);
  res.json({ message: 'Inspection deleted successfully' });
});

// POST add hazard manually
router.post('/:id/hazards', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare('SELECT * FROM inspections WHERE id = ? AND user_id = ?').get(id, userId);
  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  const { description, category, hazard_type, severity, likelihood, engineering_control, administrative_control, ppe_control, immediate_action } = req.body;

  if (!description || !category || !severity || !likelihood) {
    res.status(400).json({ error: 'Description, category, severity, and likelihood are required' });
    return;
  }

  const s = Math.min(5, Math.max(1, parseInt(severity)));
  const l = Math.min(5, Math.max(1, parseInt(likelihood)));
  const risk_score = s * l;
  let risk_level: string;
  if (risk_score <= 5) risk_level = 'Low';
  else if (risk_score <= 10) risk_level = 'Medium';
  else if (risk_score <= 15) risk_level = 'High';
  else risk_level = 'Extreme';

  const result = db.prepare(`
    INSERT INTO hazards (inspection_id, description, category, hazard_type, severity, likelihood, risk_score, risk_level, engineering_control, administrative_control, ppe_control, immediate_action, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, description, category, hazard_type || null, s, l, risk_score, risk_level,
    engineering_control || null, administrative_control || null, ppe_control || null, immediate_action || null, 1.0);

  const hazard = db.prepare('SELECT * FROM hazards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(hazard);
});

export default router;
