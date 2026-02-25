import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { AIAnalysisResult, RiskLevel } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const HIRA_PROMPT = `You are a certified workplace safety expert specializing in HIRA (Hazard Identification and Risk Assessment) with 20+ years of field experience across construction, manufacturing, and industrial sectors.

Analyze this workplace photograph thoroughly and identify ALL potential hazards visible in the image.

For each hazard, provide a detailed HIRA assessment.

SEVERITY SCALE (1-5):
1 = Minor injury (minor cuts, bruises, no lost time)
2 = First aid case (requires first aid treatment)
3 = Medical treatment case (requires medical attention, possible lost time)
4 = Serious injury (lost time injury, possible permanent disability)
5 = Fatality or catastrophic event

LIKELIHOOD SCALE (1-5):
1 = Rare (< 1% chance, highly unlikely under normal conditions)
2 = Unlikely (1-10% chance, could happen but rarely does)
3 = Possible (10-50% chance, might happen under normal conditions)
4 = Likely (50-90% chance, will probably occur under normal conditions)
5 = Almost certain (> 90% chance, expected to occur frequently)

RISK SCORE = Severity × Likelihood
RISK LEVELS: Low (1-5) | Medium (6-10) | High (11-15) | Extreme (16-25)

HAZARD CATEGORIES:
- Physical: Struck-by, caught-in, fall hazards, noise, vibration, radiation, temperature
- Chemical: Toxic substances, flammable materials, corrosives, carcinogens
- Biological: Bacteria, viruses, fungi, blood-borne pathogens
- Ergonomic: Manual handling, repetitive motion, awkward postures, poor workstation design
- Electrical: Exposed wiring, overloaded circuits, improper grounding, arc flash
- Fire: Flammable materials, ignition sources, blocked exits, inadequate fire suppression
- Mechanical: Unguarded machinery, rotating parts, pressure systems, cutting edges
- Environmental: Dust, fumes, inadequate ventilation, lighting, housekeeping

Respond ONLY with a valid JSON object — no markdown, no code block, no explanation. Use this exact structure:
{
  "hazards": [
    {
      "description": "Clear, specific description of the hazard and why it is dangerous",
      "category": "Physical|Chemical|Biological|Ergonomic|Electrical|Fire|Mechanical|Environmental",
      "hazard_type": "Specific hazard type (e.g., Fall from Height, PPE Non-compliance, Electrical Exposure)",
      "severity": 1,
      "likelihood": 1,
      "risk_score": 1,
      "risk_level": "Low|Medium|High|Extreme",
      "corrective_actions": {
        "engineering": "Engineering control: eliminate or reduce the hazard at source",
        "administrative": "Administrative control: procedures, training, scheduling, signage",
        "ppe": "Personal protective equipment required",
        "immediate": "Immediate action to take right now to prevent injury"
      },
      "confidence": 0.85
    }
  ],
  "overall_risk_level": "Low|Medium|High|Extreme",
  "summary": "Professional 2-3 sentence overall assessment of the workplace safety conditions observed in this photo."
}

If the image shows no visible workplace hazards or is not a workplace scene, return:
{"hazards":[],"overall_risk_level":"Low","summary":"No significant workplace hazards identified in this image."}`;

function getRiskLevel(score: number): RiskLevel {
  if (score <= 5) return 'Low';
  if (score <= 10) return 'Medium';
  if (score <= 15) return 'High';
  return 'Extreme';
}

function validateAndFixHazard(hazard: any): any {
  const severity = Math.min(5, Math.max(1, Number(hazard.severity) || 3));
  const likelihood = Math.min(5, Math.max(1, Number(hazard.likelihood) || 3));
  const risk_score = severity * likelihood;

  return {
    description: String(hazard.description || 'Unspecified hazard'),
    category: hazard.category || 'Physical',
    hazard_type: hazard.hazard_type || 'General Hazard',
    severity,
    likelihood,
    risk_score,
    risk_level: getRiskLevel(risk_score),
    corrective_actions: {
      engineering: String(hazard.corrective_actions?.engineering || 'Implement engineering controls to eliminate hazard'),
      administrative: String(hazard.corrective_actions?.administrative || 'Establish safe work procedures and training'),
      ppe: String(hazard.corrective_actions?.ppe || 'Use appropriate personal protective equipment'),
      immediate: String(hazard.corrective_actions?.immediate || 'Assess and address immediately'),
    },
    confidence: Math.min(1, Math.max(0, Number(hazard.confidence) || 0.8)),
  };
}

export async function analyzeImage(imagePath: string): Promise<AIAnalysisResult> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();

  let mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.gif') mimeType = 'image/gif';
  else if (ext === '.webp') mimeType = 'image/webp';
  else mimeType = 'image/jpeg';

  // Use gemini-1.5-flash via v1 API (v1beta does not support this model)
  const model = genAI.getGenerativeModel(
    { model: 'gemini-1.5-flash' },
    { apiVersion: 'v1' }
  );

  const imagePart: Part = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };

  const result = await model.generateContent([HIRA_PROMPT, imagePart]);
  const response = await result.response;
  let rawText = response.text().trim();

  // Strip markdown code blocks if present
  if (rawText.startsWith('```')) {
    rawText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse Gemini response as JSON');
    }
  }

  const hazards = Array.isArray(parsed.hazards)
    ? parsed.hazards.map(validateAndFixHazard)
    : [];

  // Determine overall risk from max hazard score
  let overallRisk: RiskLevel = 'Low';
  if (hazards.length > 0) {
    const maxScore = Math.max(...hazards.map((h: any) => h.risk_score));
    overallRisk = getRiskLevel(maxScore);
  }

  return {
    hazards,
    overall_risk_level: parsed.overall_risk_level || overallRisk,
    summary: parsed.summary || 'AI analysis complete.',
  };
}
