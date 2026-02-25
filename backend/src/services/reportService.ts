import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { Inspection, Hazard, RiskLevel } from '../types';

const RISK_COLORS: Record<RiskLevel, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#F97316',
  Extreme: '#EF4444',
};

function getRiskColor(level: RiskLevel): [number, number, number] {
  const hex = RISK_COLORS[level].replace('#', '');
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

export async function generatePDFReport(
  inspection: Inspection,
  hazards: Hazard[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;

    // Header Banner
    doc.rect(0, 0, doc.page.width, 90).fill('#1E3A5F');
    doc.fillColor('white')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('SafeVision AI', 50, 20)
      .fontSize(11)
      .font('Helvetica')
      .text('Automated Hazard Identification & Risk Assessment System', 50, 48)
      .fontSize(9)
      .text('HIRA Report | ISO 45001 Compliant Documentation', 50, 65);

    doc.moveDown(4);

    // Report Title
    doc.fillColor('#1E3A5F').fontSize(16).font('Helvetica-Bold')
      .text('HAZARD IDENTIFICATION & RISK ASSESSMENT REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#1E3A5F').lineWidth(2)
      .moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1);

    // Inspection Details Table
    doc.fillColor('#1E3A5F').fontSize(12).font('Helvetica-Bold').text('INSPECTION DETAILS');
    doc.moveDown(0.5);

    const details = [
      ['Project Name', inspection.project_name],
      ['Location', inspection.location || 'N/A'],
      ['Inspection Date', inspection.inspection_date],
      ['Inspector', inspection.inspector_name || 'N/A'],
      ['Department', inspection.department || 'N/A'],
      ['Report Generated', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
      ['Overall Risk Level', inspection.overall_risk_level || 'N/A'],
    ];

    const colW = pageWidth / 2;
    details.forEach(([label, value], i) => {
      const bgColor = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      doc.rect(50, doc.y, pageWidth, 20).fill(bgColor);
      doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
        .text(label, 55, doc.y + 5, { width: colW - 10 });
      doc.fillColor('#111827').font('Helvetica')
        .text(String(value), 55 + colW, doc.y - 14, { width: colW - 10 });
      doc.y += 6;
    });
    doc.moveDown(1);

    // AI Summary
    if (inspection.ai_summary) {
      doc.fillColor('#1E3A5F').fontSize(12).font('Helvetica-Bold').text('AI ANALYSIS SUMMARY');
      doc.moveDown(0.3);
      doc.rect(50, doc.y, pageWidth, 50).fill('#EFF6FF');
      doc.fillColor('#1E40AF').fontSize(9.5).font('Helvetica')
        .text(inspection.ai_summary, 58, doc.y + 8, { width: pageWidth - 16 });
      doc.moveDown(3.5);
    }

    // Photo
    if (fs.existsSync(inspection.image_path)) {
      doc.fillColor('#1E3A5F').fontSize(12).font('Helvetica-Bold').text('INSPECTION PHOTOGRAPH');
      doc.moveDown(0.5);
      try {
        const imgMaxWidth = pageWidth;
        const imgMaxHeight = 200;
        doc.image(inspection.image_path, 50, doc.y, {
          width: imgMaxWidth,
          height: imgMaxHeight,
          fit: [imgMaxWidth, imgMaxHeight],
          align: 'center',
        });
        doc.y += imgMaxHeight + 10;
      } catch {
        doc.fillColor('#6B7280').fontSize(9).text('[Image could not be embedded]');
      }
      doc.moveDown(1);
    }

    // Hazard Summary Table
    if (hazards.length === 0) {
      doc.fillColor('#059669').fontSize(12).font('Helvetica-Bold')
        .text('No hazards identified in this inspection.', { align: 'center' });
    } else {
      // Check if new page needed
      if (doc.y > 600) doc.addPage();

      doc.fillColor('#1E3A5F').fontSize(12).font('Helvetica-Bold').text('IDENTIFIED HAZARDS');
      doc.moveDown(0.5);

      // Table header
      const cols = [
        { label: '#', width: 25 },
        { label: 'Hazard Description', width: 160 },
        { label: 'Category', width: 75 },
        { label: 'S', width: 22 },
        { label: 'L', width: 22 },
        { label: 'Score', width: 35 },
        { label: 'Risk Level', width: 65 },
      ];

      doc.rect(50, doc.y, pageWidth, 18).fill('#1E3A5F');
      let x = 50;
      cols.forEach((col) => {
        doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
          .text(col.label, x + 3, doc.y - 13, { width: col.width - 4 });
        x += col.width;
      });
      doc.y += 5;

      hazards.forEach((hazard, i) => {
        if (doc.y > 700) doc.addPage();
        const rowHeight = 30;
        const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(50, doc.y, pageWidth, rowHeight).fill(bg);

        const [r, g, b] = getRiskColor(hazard.risk_level as RiskLevel);
        const data = [
          String(i + 1),
          hazard.description,
          hazard.category,
          String(hazard.severity),
          String(hazard.likelihood),
          String(hazard.risk_score),
          hazard.risk_level,
        ];

        x = 50;
        cols.forEach((col, ci) => {
          if (ci === 6) {
            doc.rect(x + 2, doc.y + 5, col.width - 4, 18)
              .fill([r / 255, g / 255, b / 255] as any);
            doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
              .text(data[ci], x + 3, doc.y + 9, { width: col.width - 6, align: 'center' });
          } else {
            doc.fillColor('#111827').fontSize(8).font('Helvetica')
              .text(data[ci], x + 3, doc.y + 3, { width: col.width - 4, height: rowHeight - 4 });
          }
          x += col.width;
        });
        doc.y += rowHeight;
      });

      doc.moveDown(1);

      // Corrective Actions
      if (doc.y > 600) doc.addPage();
      doc.fillColor('#1E3A5F').fontSize(12).font('Helvetica-Bold').text('CORRECTIVE ACTION PLAN');
      doc.moveDown(0.5);

      hazards.forEach((hazard, i) => {
        if (doc.y > 680) doc.addPage();
        const [r, g, b] = getRiskColor(hazard.risk_level as RiskLevel);

        // Hazard header
        doc.rect(50, doc.y, pageWidth, 20).fill([r / 255, g / 255, b / 255] as any);
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
          .text(`Hazard ${i + 1}: ${hazard.description}`, 55, doc.y + 5, { width: pageWidth - 80 });
        doc.fillColor('white').text(`Risk: ${hazard.risk_level} (${hazard.risk_score})`,
          doc.page.width - 120, doc.y - 14);
        doc.y += 8;

        const actions = [
          ['Engineering Control', hazard.engineering_control],
          ['Administrative Control', hazard.administrative_control],
          ['PPE Required', hazard.ppe_control],
          ['Immediate Action', hazard.immediate_action],
        ];

        actions.forEach(([label, value], ai) => {
          if (!value) return;
          const bg = ai % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
          const lineHeight = Math.max(20, Math.ceil(value.length / 80) * 12 + 8);
          doc.rect(50, doc.y, pageWidth, lineHeight).fill(bg);
          doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold')
            .text(label!, 55, doc.y + 4, { width: 110 });
          doc.fillColor('#111827').font('Helvetica')
            .text(value!, 170, doc.y - lineHeight + 4, { width: pageWidth - 125 });
          doc.y += lineHeight - 12 + 14;
        });
        doc.moveDown(0.8);
      });
    }

    // Footer on each page
    const pageCount = (doc as any)._pageCount || 1;
    doc.fillColor('#6B7280').fontSize(8).font('Helvetica')
      .text(
        `SafeVision AI Report | Generated: ${new Date().toLocaleString()} | Confidential`,
        50, doc.page.height - 30, { align: 'center', width: pageWidth }
      );

    doc.end();
  });
}

export async function generateExcelReport(
  inspection: Inspection,
  hazards: Hazard[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SafeVision AI';
  workbook.lastModifiedBy = 'SafeVision AI';
  workbook.created = new Date();

  // ---- Sheet 1: Inspection Summary ----
  const summarySheet = workbook.addWorksheet('Inspection Summary', {
    properties: { tabColor: { argb: '1E3A5F' } },
  });

  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'SafeVision AI - HIRA Report';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  const summaryData = [
    ['Project Name', inspection.project_name],
    ['Location', inspection.location || 'N/A'],
    ['Inspection Date', inspection.inspection_date],
    ['Inspector', inspection.inspector_name || 'N/A'],
    ['Department', inspection.department || 'N/A'],
    ['Overall Risk Level', inspection.overall_risk_level || 'N/A'],
    ['Total Hazards', hazards.length],
    ['Extreme Risk', hazards.filter((h) => h.risk_level === 'Extreme').length],
    ['High Risk', hazards.filter((h) => h.risk_level === 'High').length],
    ['Medium Risk', hazards.filter((h) => h.risk_level === 'Medium').length],
    ['Low Risk', hazards.filter((h) => h.risk_level === 'Low').length],
    ['AI Summary', inspection.ai_summary || 'N/A'],
    ['Report Date', new Date().toLocaleDateString()],
  ];

  summaryData.forEach(([label, value], i) => {
    const row = summarySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
  });

  summarySheet.columns = [
    { key: 'label', width: 22 },
    { key: 'value', width: 50 },
  ];

  // ---- Sheet 2: Hazard Details ----
  const hazardSheet = workbook.addWorksheet('Hazard Details', {
    properties: { tabColor: { argb: 'FFEF4444' } },
  });

  const headers = [
    'No.', 'Description', 'Category', 'Hazard Type',
    'Severity (1-5)', 'Likelihood (1-5)', 'Risk Score', 'Risk Level',
    'Engineering Control', 'Administrative Control', 'PPE Required', 'Immediate Action',
    'Confidence (%)',
  ];

  const headerRow = hazardSheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  hazardSheet.getRow(1).height = 25;

  const riskArgb: Record<RiskLevel, string> = {
    Low: 'FFD1FAE5',
    Medium: 'FFFEF3C7',
    High: 'FFFFEDD5',
    Extreme: 'FFFEE2E2',
  };

  hazards.forEach((hazard, i) => {
    const row = hazardSheet.addRow([
      i + 1,
      hazard.description,
      hazard.category,
      hazard.hazard_type || '',
      hazard.severity,
      hazard.likelihood,
      hazard.risk_score,
      hazard.risk_level,
      hazard.engineering_control || '',
      hazard.administrative_control || '',
      hazard.ppe_control || '',
      hazard.immediate_action || '',
      hazard.confidence ? Math.round(hazard.confidence * 100) : '',
    ]);

    const riskColor = riskArgb[hazard.risk_level as RiskLevel] || 'FFFFFFFF';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    // Color risk level cell
    const riskCell = row.getCell(8);
    riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColor } };
    riskCell.font = { bold: true };
    riskCell.alignment = { horizontal: 'center', vertical: 'middle' };

    row.height = 40;
  });

  hazardSheet.columns = [
    { width: 6 }, { width: 35 }, { width: 14 }, { width: 20 },
    { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 },
    { width: 35 }, { width: 35 }, { width: 25 }, { width: 35 },
    { width: 14 },
  ];

  // ---- Sheet 3: Risk Matrix ----
  const matrixSheet = workbook.addWorksheet('Risk Matrix', {
    properties: { tabColor: { argb: 'FFF59E0B' } },
  });

  matrixSheet.mergeCells('A1:G1');
  const matrixTitle = matrixSheet.getCell('A1');
  matrixTitle.value = '5×5 RISK ASSESSMENT MATRIX';
  matrixTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  matrixTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  matrixTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  matrixSheet.getRow(1).height = 30;

  const severityLabels = ['', 'L=1 Rare', 'L=2 Unlikely', 'L=3 Possible', 'L=4 Likely', 'L=5 Almost Certain'];
  matrixSheet.addRow(severityLabels).eachCell((c) => {
    c.font = { bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const cellColors: Record<number, string> = {
    1: 'FFD1FAE5', 2: 'FFD1FAE5', 3: 'FFD1FAE5', 4: 'FFFEF3C7', 5: 'FFFEF3C7',
    6: 'FFFEF3C7', 8: 'FFFEF3C7', 9: 'FFFEF3C7', 10: 'FFFEF3C7',
    12: 'FFFFEDD5', 15: 'FFFFEDD5',
    16: 'FFFEE2E2', 20: 'FFFEE2E2', 25: 'FFFEE2E2',
  };

  for (let s = 5; s >= 1; s--) {
    const rowData: (string | number)[] = [`S=${s}`];
    for (let l = 1; l <= 5; l++) {
      rowData.push(s * l);
    }
    const row = matrixSheet.addRow(rowData);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
    row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (let l = 1; l <= 5; l++) {
      const score = s * l;
      const cell = row.getCell(l + 1);
      let color = 'FFD1FAE5';
      if (score > 15) color = 'FFFEE2E2';
      else if (score > 10) color = 'FFFFEDD5';
      else if (score > 5) color = 'FFFEF3C7';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    row.height = 25;
  }

  matrixSheet.columns = [{ width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 20 }];

  // Add legend
  matrixSheet.addRow([]);
  const legendData = [
    ['Low (1-5)', 'FFD1FAE5'],
    ['Medium (6-10)', 'FFFEF3C7'],
    ['High (11-15)', 'FFFFEDD5'],
    ['Extreme (16-25)', 'FFFEE2E2'],
  ];
  legendData.forEach(([label, color]) => {
    const row = matrixSheet.addRow([label]);
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    row.getCell(1).font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
