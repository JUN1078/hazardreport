import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, FileSpreadsheet, FileText, Trash2,
  AlertTriangle, CheckCircle2, RefreshCw, PlusCircle, X
} from 'lucide-react';
import { inspectionApi, reportApi } from '../lib/api';
import { Inspection, Hazard, RISK_BG_COLORS } from '../types';
import HazardCard from '../components/HazardCard';
import RiskMatrix from '../components/RiskMatrix';

const CATEGORIES = ['Physical', 'Chemical', 'Biological', 'Ergonomic', 'Electrical', 'Fire', 'Mechanical', 'Environmental', 'Psychosocial'];

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);
  const [showAddHazard, setShowAddHazard] = useState(false);
  const [addForm, setAddForm] = useState({
    description: '', category: 'Physical', hazard_type: '',
    severity: '3', likelihood: '3',
    engineering_control: '', administrative_control: '',
    ppe_control: '', immediate_action: '',
  });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await inspectionApi.get(Number(id));
      setInspection(res.data.inspection);
      setHazards(res.data.hazards);
    } catch {
      setError('Inspection not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this inspection and all its hazards? This cannot be undone.')) return;
    try {
      await inspectionApi.delete(Number(id));
      navigate('/history');
    } catch {
      alert('Failed to delete inspection');
    }
  };

  const handleDownloadPDF = async () => {
    if (!inspection) return;
    setDownloading('pdf');
    try {
      await reportApi.downloadPDF(
        inspection.id,
        `HIRA_${inspection.project_name}_${inspection.inspection_date}.pdf`
      );
    } catch {
      alert('PDF generation failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (!inspection) return;
    setDownloading('excel');
    try {
      await reportApi.downloadExcel(
        inspection.id,
        `HIRA_${inspection.project_name}_${inspection.inspection_date}.xlsx`
      );
    } catch {
      alert('Excel generation failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleAddHazard = async () => {
    setAdding(true);
    try {
      const res = await inspectionApi.addHazard(Number(id), addForm);
      setHazards((prev) => [res.data, ...prev].sort((a, b) => b.risk_score - a.risk_score));
      setShowAddHazard(false);
      setAddForm({ description: '', category: 'Physical', hazard_type: '', severity: '3', likelihood: '3', engineering_control: '', administrative_control: '', ppe_control: '', immediate_action: '' });
    } catch {
      alert('Failed to add hazard');
    } finally {
      setAdding(false);
    }
  };

  const handleHazardUpdate = (updated: Hazard) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === updated.id ? updated : h)).sort((a, b) => b.risk_score - a.risk_score)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={40} className="text-red-400 mb-3" />
        <p className="text-gray-600 mb-3">{error}</p>
        <Link to="/history" className="btn-primary text-sm">Back to History</Link>
      </div>
    );
  }

  const extremeCount = hazards.filter((h) => h.risk_level === 'Extreme').length;
  const highCount = hazards.filter((h) => h.risk_level === 'High').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/history" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="page-title leading-tight">{inspection.project_name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {inspection.location && `${inspection.location} · `}
              {inspection.inspection_date}
              {inspection.inspector_name && ` · ${inspection.inspector_name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPDF}
            disabled={!!downloading}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {downloading === 'pdf' ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            PDF Report
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={!!downloading}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {downloading === 'excel' ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Excel
          </button>
          <button
            onClick={handleDelete}
            className="btn-danger text-sm flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {inspection.overall_risk_level && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          inspection.overall_risk_level === 'Extreme' ? 'bg-red-50 border-red-200' :
          inspection.overall_risk_level === 'High' ? 'bg-orange-50 border-orange-200' :
          inspection.overall_risk_level === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          {inspection.overall_risk_level === 'Low' ? (
            <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle size={20} className={`mt-0.5 flex-shrink-0 ${
              inspection.overall_risk_level === 'Extreme' ? 'text-red-600' :
              inspection.overall_risk_level === 'High' ? 'text-orange-600' : 'text-yellow-600'
            }`} />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${RISK_BG_COLORS[inspection.overall_risk_level].split(' ')[1]}`}>
                Overall Risk: {inspection.overall_risk_level}
              </span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-sm text-gray-600">{hazards.length} hazards identified</span>
              {extremeCount > 0 && <span className="text-sm text-red-600 font-medium">· {extremeCount} extreme</span>}
              {highCount > 0 && <span className="text-sm text-orange-600 font-medium">· {highCount} high priority</span>}
            </div>
            {inspection.ai_summary && (
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{inspection.ai_summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Photo + Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Photo */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="section-title">Inspection Photograph</h3>
          </div>
          <img
            src={reportApi.imageUrl(inspection.id)}
            alt="Inspection"
            className="w-full object-contain max-h-72 bg-gray-900"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Risk Matrix */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Risk Matrix</h3>
          <div className="flex justify-center">
            <RiskMatrix hazards={hazards} compact />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Numbered badges show hazard count per cell</p>
        </div>
      </div>

      {/* Hazards list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Identified Hazards ({hazards.length})</h3>
          <button
            onClick={() => setShowAddHazard(!showAddHazard)}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {showAddHazard ? <X size={14} /> : <PlusCircle size={14} />}
            {showAddHazard ? 'Cancel' : 'Add Hazard'}
          </button>
        </div>

        {/* Add hazard form */}
        {showAddHazard && (
          <div className="card p-5 border border-brand-200">
            <h4 className="font-medium text-gray-900 mb-4">Add Manual Hazard</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Description *</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Describe the hazard..."
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="input" value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hazard Type</label>
                <input className="input" placeholder="e.g. Fall from Height" value={addForm.hazard_type} onChange={(e) => setAddForm((f) => ({ ...f, hazard_type: e.target.value }))} />
              </div>
              <div>
                <label className="label">Severity (1-5) *</label>
                <select className="input" value={addForm.severity} onChange={(e) => setAddForm((f) => ({ ...f, severity: e.target.value }))}>
                  {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Likelihood (1-5) *</label>
                <select className="input" value={addForm.likelihood} onChange={(e) => setAddForm((f) => ({ ...f, likelihood: e.target.value }))}>
                  {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Engineering Control</label>
                <input className="input" value={addForm.engineering_control} onChange={(e) => setAddForm((f) => ({ ...f, engineering_control: e.target.value }))} />
              </div>
              <div>
                <label className="label">Administrative Control</label>
                <input className="input" value={addForm.administrative_control} onChange={(e) => setAddForm((f) => ({ ...f, administrative_control: e.target.value }))} />
              </div>
              <div>
                <label className="label">PPE Required</label>
                <input className="input" value={addForm.ppe_control} onChange={(e) => setAddForm((f) => ({ ...f, ppe_control: e.target.value }))} />
              </div>
              <div>
                <label className="label">Immediate Action</label>
                <input className="input" value={addForm.immediate_action} onChange={(e) => setAddForm((f) => ({ ...f, immediate_action: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowAddHazard(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleAddHazard} disabled={adding || !addForm.description} className="btn-primary text-sm">
                {adding ? 'Adding...' : 'Add Hazard'}
              </button>
            </div>
          </div>
        )}

        {hazards.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-400" />
            <p>No hazards identified. Workplace appears safe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hazards.map((hazard, i) => (
              <HazardCard key={hazard.id} hazard={hazard} index={i} onUpdate={handleHazardUpdate} />
            ))}
          </div>
        )}
      </div>

      {/* Download actions */}
      {hazards.length > 0 && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <h3 className="font-medium text-brand-800 mb-3 flex items-center gap-2">
            <Download size={16} />
            Export Report
          </h3>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleDownloadPDF} disabled={!!downloading} className="btn-primary flex items-center gap-2 text-sm">
              {downloading === 'pdf' ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
              Download PDF Report
            </button>
            <button onClick={handleDownloadExcel} disabled={!!downloading} className="btn-secondary flex items-center gap-2 text-sm">
              {downloading === 'excel' ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Download Excel
            </button>
          </div>
          <p className="text-xs text-brand-600 mt-2">Reports include full HIRA table, risk matrix, and corrective action plan</p>
        </div>
      )}
    </div>
  );
}
