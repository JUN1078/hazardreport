import { Request } from 'express';

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'hse_officer' | 'project_manager' | 'supervisor' | 'auditor' | 'admin';
  full_name: string | null;
  created_at: string;
}

export interface Inspection {
  id: number;
  user_id: number;
  project_name: string;
  location: string | null;
  inspection_date: string;
  inspector_name: string | null;
  department: string | null;
  image_path: string;
  image_filename: string | null;
  ai_summary: string | null;
  overall_risk_level: RiskLevel | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  notes: string | null;
  created_at: string;
}

export interface Hazard {
  id: number;
  inspection_id: number;
  description: string;
  category: HazardCategory;
  hazard_type: string | null;
  severity: number;
  likelihood: number;
  risk_score: number;
  risk_level: RiskLevel;
  engineering_control: string | null;
  administrative_control: string | null;
  ppe_control: string | null;
  immediate_action: string | null;
  confidence: number | null;
  created_at: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export type HazardCategory =
  | 'Physical'
  | 'Chemical'
  | 'Biological'
  | 'Ergonomic'
  | 'Electrical'
  | 'Fire'
  | 'Mechanical'
  | 'Environmental'
  | 'Psychosocial';

export interface AIHazardResult {
  description: string;
  category: HazardCategory;
  hazard_type: string;
  severity: number;
  likelihood: number;
  risk_score: number;
  risk_level: RiskLevel;
  corrective_actions: {
    engineering: string;
    administrative: string;
    ppe: string;
    immediate: string;
  };
  confidence: number;
}

export interface AIAnalysisResult {
  hazards: AIHazardResult[];
  overall_risk_level: RiskLevel;
  summary: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export interface DashboardStats {
  total_inspections: number;
  total_hazards: number;
  extreme_hazards: number;
  high_hazards: number;
  medium_hazards: number;
  low_hazards: number;
  recent_inspections: Partial<Inspection>[];
  hazards_by_category: { category: string; count: number }[];
  risk_trend: { date: string; count: number; risk_level: string }[];
}
