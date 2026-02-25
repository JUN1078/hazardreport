import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../lib/api';
import { setAuth } from '../lib/auth';

type Mode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'hse_officer',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let res;
      if (mode === 'login') {
        res = await authApi.login(form.username, form.password);
      } else {
        res = await authApi.register({
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name || undefined,
          role: form.role,
        });
      }
      setAuth(res.data.token, res.data.user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center text-white p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SafeVision AI</h1>
              <p className="text-blue-200 text-sm">HIRA Assessment System</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            AI-Powered Workplace<br />Safety Assessment
          </h2>
          <p className="text-blue-200 text-lg mb-8 leading-relaxed">
            Upload a photo, get instant hazard identification, HIRA classification, and professional risk assessment reports.
          </p>

          <div className="space-y-3">
            {[
              { icon: '📸', text: 'Photo-based hazard detection' },
              { icon: '🤖', text: 'AI-powered HIRA classification' },
              { icon: '📊', text: 'Automated risk scoring (5×5 matrix)' },
              { icon: '📄', text: 'PDF & Excel report export' },
              { icon: '✅', text: 'ISO 45001 & SMK3 compliant' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-blue-100">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <ShieldCheck size={24} className="text-brand-800" />
            <h1 className="text-xl font-bold text-brand-800">SafeVision AI</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to your SafeVision account'
              : 'Join your team on SafeVision AI'}
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="Your full name" value={form.full_name} onChange={set('full_name')} />
              </div>
            )}

            <div>
              <label className="label">{mode === 'login' ? 'Username or Email' : 'Username'}</label>
              <input
                className="input"
                placeholder={mode === 'login' ? 'Enter username or email' : 'Choose a username'}
                value={form.username}
                onChange={set('username')}
                required
                autoComplete="username"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Enter your password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="hse_officer">HSE Officer</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="supervisor">Site Supervisor</option>
                  <option value="auditor">Compliance Auditor</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-brand-600 font-medium hover:underline"
              >
                {mode === 'login' ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Demo credentials hint */}
          {mode === 'login' && (
            <div className="mt-4 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <strong>Quick start:</strong> Register a new account to begin, or use demo credentials if pre-configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
