import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken } from '../middleware/auth';
import { generatePDFReport, generateExcelReport } from '../services/reportService';
import { AuthRequest, Inspection, Hazard } from '../types';

const router = Router();

// GET PDF report
router.get('/:id/pdf', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare(
    'SELECT * FROM inspections WHERE id = ? AND user_id = ?'
  ).get(id, userId) as Inspection | undefined;

  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  const hazards = db.prepare(
    'SELECT * FROM hazards WHERE inspection_id = ? ORDER BY risk_score DESC'
  ).all(id) as Hazard[];

  try {
    const pdfBuffer = await generatePDFReport(inspection, hazards);
    const filename = `HIRA_Report_${inspection.project_name.replace(/[^a-z0-9]/gi, '_')}_${inspection.inspection_date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report', message: err.message });
  }
});

// GET Excel report
router.get('/:id/excel', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare(
    'SELECT * FROM inspections WHERE id = ? AND user_id = ?'
  ).get(id, userId) as Inspection | undefined;

  if (!inspection) {
    res.status(404).json({ error: 'Inspection not found' });
    return;
  }

  const hazards = db.prepare(
    'SELECT * FROM hazards WHERE inspection_id = ? ORDER BY risk_score DESC'
  ).all(id) as Hazard[];

  try {
    const excelBuffer = await generateExcelReport(inspection, hazards);
    const filename = `HIRA_Report_${inspection.project_name.replace(/[^a-z0-9]/gi, '_')}_${inspection.inspection_date}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);
  } catch (err: any) {
    console.error('Excel generation error:', err);
    res.status(500).json({ error: 'Failed to generate Excel report', message: err.message });
  }
});

// GET inspection image
router.get('/:id/image', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const inspection = db.prepare(
    'SELECT image_path FROM inspections WHERE id = ? AND user_id = ?'
  ).get(id, userId) as { image_path: string } | undefined;

  if (!inspection || !inspection.image_path) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  const fs = require('fs');
  if (!fs.existsSync(inspection.image_path)) {
    res.status(404).json({ error: 'Image file not found' });
    return;
  }

  res.sendFile(inspection.image_path);
});

export default router;
