import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, LayoutDashboard, PlusCircle, ClipboardList,
  LogOut, User, ChevronRight, AlertTriangle
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/inspect', label: 'New Inspection', icon: PlusCircle },
  { to: '/history', label: 'Inspection History', icon: ClipboardList },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-800 text-white flex flex-col fixed h-full z-10 shadow-xl">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-blue-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">SafeVision AI</h1>
              <p className="text-blue-300 text-xs">HIRA Assessment System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* Alert indicator */}
        <div className="px-3 pb-2">
          <div className="bg-red-900/40 border border-red-500/30 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-300">Compliance Standards</p>
              <p className="text-xs text-red-400 mt-0.5">ISO 45001 · SMK3 · OHSAS</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-3 py-4 border-t border-blue-700/50">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-blue-300 truncate capitalize">
                {user?.role?.replace('_', ' ') || 'HSE Officer'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-red-600/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
