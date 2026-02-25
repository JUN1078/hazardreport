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

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
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
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  created_at: string;
  hazard_count?: number;
  extreme_count?: number;
  high_count?: number;
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

export interface DashboardStats {
  total_inspections: number;
  total_hazards: number;
  extreme_hazards: number;
  high_hazards: number;
  medium_hazards: number;
  low_hazards: number;
  recent_inspections: Inspection[];
  hazards_by_category: { category: string; count: number }[];
  risk_trend: { date: string; count: number; max_risk_level: string }[];
  high_risk_alerts: (Hazard & { project_name: string; location: string; inspection_id: number })[];
  inspections_by_risk: { overall_risk_level: string; count: number }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#F97316',
  Extreme: '#EF4444',
};

export const RISK_BG_COLORS: Record<RiskLevel, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Extreme: 'bg-red-100 text-red-800',
};

export const SEVERITY_LABELS: Record<number, string> = {
  1: 'Minor',
  2: 'First Aid',
  3: 'Medical',
  4: 'Serious',
  5: 'Fatal',
};

export const LIKELIHOOD_LABELS: Record<number, string> = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Physical: '#3B82F6',
  Chemical: '#8B5CF6',
  Biological: '#10B981',
  Ergonomic: '#F59E0B',
  Electrical: '#EF4444',
  Fire: '#F97316',
  Mechanical: '#6B7280',
  Environmental: '#14B8A6',
  Psychosocial: '#EC4899',
};
