import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, ClipboardCheck, AlertTriangle, TrendingUp,
  ArrowRight, RefreshCw, PlusCircle, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardApi } from '../lib/api';
import { DashboardStats, RISK_BG_COLORS, CATEGORY_COLORS } from '../types';
import RiskMatrix from '../components/RiskMatrix';

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const RISK_PIE_COLORS: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#F97316',
  Extreme: '#EF4444',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.stats();
      setStats(res.data);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle size={40} className="text-red-400 mb-3" />
        <p className="text-gray-600 mb-3">{error}</p>
        <button onClick={load} className="btn-primary text-sm">Retry</button>
      </div>
    );
  }

  const pieData = stats.inspections_by_risk.map((item) => ({
    name: item.overall_risk_level,
    value: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Safety Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of all workplace hazard assessments</p>
        </div>
        <Link to="/inspect" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle size={16} />
          New Inspection
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inspections" value={stats.total_inspections} icon={ClipboardCheck} color="bg-brand-700" sub="All time" />
        <StatCard label="Total Hazards" value={stats.total_hazards} icon={AlertTriangle} color="bg-yellow-500" sub="Identified" />
        <StatCard label="Extreme Risk" value={stats.extreme_hazards} icon={ShieldAlert} color="bg-red-500" sub="Immediate action" />
        <StatCard label="High Risk" value={stats.high_hazards} icon={TrendingUp} color="bg-orange-500" sub="Priority action" />
      </div>

      {/* Risk distribution + Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Risk Distribution</h3>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={RISK_PIE_COLORS[entry.name] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`${val} inspections`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category chart */}
        <div className="card p-5 col-span-1 lg:col-span-2">
          <h3 className="section-title mb-4">Hazards by Category</h3>
          {stats.hazards_by_category.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No hazards recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.hazards_by_category} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Hazards" radius={[4, 4, 0, 0]}>
                  {stats.hazards_by_category.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* High risk alerts + Risk matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* High risk alerts */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">High Priority Alerts</h3>
            <Link to="/history?risk=Extreme" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {stats.high_risk_alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShieldAlert size={32} className="mb-2 text-green-400" />
              <p className="text-sm">No high-risk hazards found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.high_risk_alerts.slice(0, 6).map((alert) => (
                <Link
                  key={alert.id}
                  to={`/inspections/${alert.inspection_id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 group"
                >
                  <div className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${RISK_BG_COLORS[alert.risk_level]}`}>
                    {alert.risk_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate font-medium">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {alert.project_name} {alert.location ? `· ${alert.location}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${RISK_BG_COLORS[alert.risk_level]}`}>
                    {alert.risk_level}
                  </span>
                  <Eye size={14} className="text-gray-300 group-hover:text-brand-500 flex-shrink-0 mt-1 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Risk Matrix */}
        <div className="card p-5 flex flex-col">
          <h3 className="section-title mb-4">Risk Matrix</h3>
          <div className="flex-1 flex items-center justify-center overflow-auto">
            <RiskMatrix compact />
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">S = Severity · L = Likelihood</p>
        </div>
      </div>

      {/* Recent inspections */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Recent Inspections</h3>
          <Link to="/history" className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {stats.recent_inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <ClipboardCheck size={32} className="mb-2" />
            <p className="text-sm">No inspections yet</p>
            <Link to="/inspect" className="mt-2 text-brand-600 text-sm hover:underline">
              Start your first inspection
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Project</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Location</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Hazards</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Risk</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_inspections.map((insp) => (
                  <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <Link to={`/inspections/${insp.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                        {insp.project_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{insp.location || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500">{insp.inspection_date}</td>
                    <td className="py-3 pr-4 text-gray-700">{(insp as any).hazard_count || 0}</td>
                    <td className="py-3">
                      {insp.overall_risk_level ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RISK_BG_COLORS[insp.overall_risk_level]}`}>
                          {insp.overall_risk_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
