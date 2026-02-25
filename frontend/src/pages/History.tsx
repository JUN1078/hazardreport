import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, Eye, Trash2, RefreshCw, AlertTriangle,
  ClipboardList, PlusCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { inspectionApi } from '../lib/api';
import { Inspection, RISK_BG_COLORS } from '../types';

const RISK_LEVELS = ['All', 'Extreme', 'High', 'Medium', 'Low'];

export default function History() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || 'All');
  const [page, setPage] = useState(1);
  const limit = 15;

  const load = async (p = page) => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {
      page: String(p),
      limit: String(limit),
    };
    if (search) params.search = search;
    if (riskFilter !== 'All') params.risk_level = riskFilter;

    try {
      const res = await inspectionApi.list(params);
      setInspections(res.data.inspections);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => load(1), 300);
    return () => clearTimeout(timeout);
  }, [search, riskFilter]);

  useEffect(() => { load(page); }, [page]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm('Delete this inspection?')) return;
    try {
      await inspectionApi.delete(id);
      load(page);
    } catch {
      alert('Failed to delete');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Inspection History</h1>
          <p className="text-gray-500 text-sm mt-1">{total} inspection{total !== 1 ? 's' : ''} recorded</p>
        </div>
        <Link to="/inspect" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle size={16} />
          New Inspection
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-48 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search project or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Risk filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {RISK_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => { setRiskFilter(level); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    riskFilter === level
                      ? 'bg-brand-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw size={28} className="animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <AlertTriangle size={36} className="mb-3 text-red-400" />
          <p>{error}</p>
          <button onClick={() => load()} className="mt-3 btn-primary text-sm">Retry</button>
        </div>
      ) : inspections.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center text-gray-400">
          <ClipboardList size={48} className="mb-4" />
          <p className="text-lg font-medium text-gray-600">No inspections found</p>
          <p className="text-sm mt-1 mb-4">
            {search || riskFilter !== 'All'
              ? 'Try adjusting your filters'
              : 'Start your first workplace safety inspection'}
          </p>
          {!search && riskFilter === 'All' && (
            <Link to="/inspect" className="btn-primary text-sm">New Inspection</Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inspector</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hazards</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Extreme</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/inspections/${insp.id}`}
                        className="font-medium text-gray-900 hover:text-brand-700 transition-colors"
                      >
                        {insp.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{insp.location || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{insp.inspection_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{insp.inspector_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">{insp.hazard_count || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(insp.extreme_count || 0) > 0 ? (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                          {insp.extreme_count}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {insp.overall_risk_level ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RISK_BG_COLORS[insp.overall_risk_level]}`}>
                          {insp.overall_risk_level}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        insp.status === 'completed' ? 'bg-green-100 text-green-700' :
                        insp.status === 'analyzing' ? 'bg-blue-100 text-blue-700' :
                        insp.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/inspections/${insp.id}`}
                          className="p-1.5 rounded hover:bg-brand-100 text-gray-400 hover:text-brand-600 transition-colors"
                          title="View"
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(insp.id, e)}
                          className="p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
