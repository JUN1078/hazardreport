import { Router, Response } from 'express';
import { getDb } from '../db/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb();
  const userId = req.user!.id;

  const totalInspections = (db.prepare(
    'SELECT COUNT(*) as count FROM inspections WHERE user_id = ?'
  ).get(userId) as any).count;

  const totalHazards = (db.prepare(
    'SELECT COUNT(*) as count FROM hazards h JOIN inspections i ON i.id = h.inspection_id WHERE i.user_id = ?'
  ).get(userId) as any).count;

  const riskCounts = db.prepare(`
    SELECT h.risk_level, COUNT(*) as count
    FROM hazards h
    JOIN inspections i ON i.id = h.inspection_id
    WHERE i.user_id = ?
    GROUP BY h.risk_level
  `).all(userId) as { risk_level: string; count: number }[];

  const riskMap = Object.fromEntries(riskCounts.map((r) => [r.risk_level, r.count]));

  const recentInspections = db.prepare(`
    SELECT i.id, i.project_name, i.location, i.inspection_date, i.overall_risk_level, i.status, i.created_at,
      COUNT(h.id) as hazard_count
    FROM inspections i
    LEFT JOIN hazards h ON h.inspection_id = i.id
    WHERE i.user_id = ?
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT 5
  `).all(userId);

  const hazardsByCategory = db.prepare(`
    SELECT h.category, COUNT(*) as count
    FROM hazards h
    JOIN inspections i ON i.id = h.inspection_id
    WHERE i.user_id = ?
    GROUP BY h.category
    ORDER BY count DESC
  `).all(userId) as { category: string; count: number }[];

  const riskTrend = db.prepare(`
    SELECT DATE(i.created_at) as date,
      COUNT(h.id) as count,
      MAX(h.risk_level) as max_risk_level
    FROM inspections i
    LEFT JOIN hazards h ON h.inspection_id = i.id
    WHERE i.user_id = ? AND i.created_at >= DATE('now', '-30 days')
    GROUP BY DATE(i.created_at)
    ORDER BY date ASC
  `).all(userId) as { date: string; count: number; max_risk_level: string }[];

  const highRiskAlerts = db.prepare(`
    SELECT h.id, h.description, h.risk_level, h.risk_score, h.category,
      i.project_name, i.location, i.inspection_date, i.id as inspection_id
    FROM hazards h
    JOIN inspections i ON i.id = h.inspection_id
    WHERE i.user_id = ? AND h.risk_level IN ('High', 'Extreme')
    ORDER BY h.risk_score DESC, i.created_at DESC
    LIMIT 10
  `).all(userId);

  const inspectionsByRisk = db.prepare(`
    SELECT overall_risk_level, COUNT(*) as count
    FROM inspections
    WHERE user_id = ? AND overall_risk_level IS NOT NULL
    GROUP BY overall_risk_level
  `).all(userId) as { overall_risk_level: string; count: number }[];

  res.json({
    total_inspections: totalInspections,
    total_hazards: totalHazards,
    extreme_hazards: riskMap['Extreme'] || 0,
    high_hazards: riskMap['High'] || 0,
    medium_hazards: riskMap['Medium'] || 0,
    low_hazards: riskMap['Low'] || 0,
    recent_inspections: recentInspections,
    hazards_by_category: hazardsByCategory,
    risk_trend: riskTrend,
    high_risk_alerts: highRiskAlerts,
    inspections_by_risk: inspectionsByRisk,
  });
});

export default router;
