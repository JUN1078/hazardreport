import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check, X, AlertTriangle, Wrench, BookOpen, HardHat, Zap } from 'lucide-react';
import { Hazard, RISK_BG_COLORS, SEVERITY_LABELS, LIKELIHOOD_LABELS, CATEGORY_COLORS } from '../types';
import { inspectionApi } from '../lib/api';

interface HazardCardProps {
  hazard: Hazard;
  index: number;
  onUpdate?: (updatedHazard: Hazard) => void;
}

const CATEGORIES = ['Physical', 'Chemical', 'Biological', 'Ergonomic', 'Electrical', 'Fire', 'Mechanical', 'Environmental', 'Psychosocial'];

export default function HazardCard({ hazard, index, onUpdate }: HazardCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    severity: hazard.severity,
    likelihood: hazard.likelihood,
    category: hazard.category,
    description: hazard.description,
    engineering_control: hazard.engineering_control || '',
    administrative_control: hazard.administrative_control || '',
    ppe_control: hazard.ppe_control || '',
    immediate_action: hazard.immediate_action || '',
  });

  const riskBadge = RISK_BG_COLORS[hazard.risk_level];
  const catColor = CATEGORY_COLORS[hazard.category] || '#6B7280';

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await inspectionApi.updateHazard(hazard.id, editData);
      onUpdate?.(res.data);
      setEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const previewScore = editData.severity * editData.likelihood;
  let previewLevel = 'Low';
  if (previewScore > 15) previewLevel = 'Extreme';
  else if (previewScore > 10) previewLevel = 'High';
  else if (previewScore > 5) previewLevel = 'Medium';

  return (
    <div className={`card border-l-4 transition-shadow hover:shadow-md ${
      hazard.risk_level === 'Extreme' ? 'border-l-red-500' :
      hazard.risk_level === 'High' ? 'border-l-orange-500' :
      hazard.risk_level === 'Medium' ? 'border-l-yellow-500' :
      'border-l-green-500'
    }`}>
      {/* Card Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => !editing && setExpanded(!expanded)}
      >
        {/* Index badge */}
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0 mt-0.5">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: catColor }}
            >
              {hazard.category}
            </span>
            {hazard.hazard_type && (
              <span className="text-xs text-gray-500">{hazard.hazard_type}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 leading-snug">{hazard.description}</p>
        </div>

        {/* Risk score */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{hazard.risk_score}</div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${riskBadge}`}>
            {hazard.risk_level}
          </span>
        </div>

        {/* Expand/collapse */}
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Quick metrics row */}
      <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-500 -mt-2">
        <span>Severity: <strong className="text-gray-700">{hazard.severity} – {SEVERITY_LABELS[hazard.severity]}</strong></span>
        <span>·</span>
        <span>Likelihood: <strong className="text-gray-700">{hazard.likelihood} – {LIKELIHOOD_LABELS[hazard.likelihood]}</strong></span>
        {hazard.confidence && (
          <>
            <span>·</span>
            <span>AI Confidence: <strong className="text-gray-700">{Math.round(hazard.confidence * 100)}%</strong></span>
          </>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          {editing ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={editData.category}
                    onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value as any }))}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={editData.description}
                    onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Severity (1–5)</label>
                  <select
                    className="input"
                    value={editData.severity}
                    onChange={(e) => setEditData((d) => ({ ...d, severity: +e.target.value }))}
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>{v} – {SEVERITY_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Likelihood (1–5)</label>
                  <select
                    className="input"
                    value={editData.likelihood}
                    onChange={(e) => setEditData((d) => ({ ...d, likelihood: +e.target.value }))}
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>{v} – {LIKELIHOOD_LABELS[v]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-sm text-gray-600">Recalculated Risk:</span>
                <span className="text-lg font-bold text-gray-800">{previewScore}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RISK_BG_COLORS[previewLevel as keyof typeof RISK_BG_COLORS]}`}>
                  {previewLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'engineering_control', label: 'Engineering Control' },
                  { key: 'administrative_control', label: 'Administrative Control' },
                  { key: 'ppe_control', label: 'PPE Required' },
                  { key: 'immediate_action', label: 'Immediate Action' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <textarea
                      className="input resize-none"
                      rows={2}
                      value={(editData as any)[key]}
                      onChange={(e) => setEditData((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="btn-secondary text-sm py-1.5 flex items-center gap-1"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-sm py-1.5 flex items-center gap-1"
                >
                  <Check size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { icon: Wrench, label: 'Engineering Control', value: hazard.engineering_control, color: 'text-blue-600 bg-blue-50' },
                  { icon: BookOpen, label: 'Administrative Control', value: hazard.administrative_control, color: 'text-purple-600 bg-purple-50' },
                  { icon: HardHat, label: 'PPE Required', value: hazard.ppe_control, color: 'text-yellow-600 bg-yellow-50' },
                  { icon: Zap, label: 'Immediate Action', value: hazard.immediate_action, color: 'text-red-600 bg-red-50' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className={`rounded-lg p-3 ${color.split(' ')[1]}`}>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${color.split(' ')[0]}`}>
                      <Icon size={12} />
                      {label}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {value || <span className="text-gray-400 italic">Not specified</span>}
                    </p>
                  </div>
                ))}
              </div>

              {onUpdate && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                >
                  <Edit2 size={12} /> Manual Override
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
