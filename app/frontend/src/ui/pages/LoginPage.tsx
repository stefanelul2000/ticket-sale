import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../state/useAuth';

const iconClasses = 'h-4 w-4 text-white/70';

function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm text-white/70">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner shadow-black/20 focus-within:border-blue-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconClasses}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {type === 'password' ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M12 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zM5 20a7 7 0 0114 0" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M5.121 17.804A4 4 0 017 16h10a4 4 0 011.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          )}
        </svg>
        <input
          className="flex-1 bg-transparent text-base text-white placeholder-white/50 outline-none"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          autoComplete={autoComplete}
          required
        />
      </div>
    </label>
  );
}

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.from?.pathname ?? '/dashboard';
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(form.username, form.password, form.remember);
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Invalid credentials.');
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue managing your events">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthField
          label="Username"
          value={form.username}
          onChange={(value) => setForm((prev) => ({ ...prev, username: value }))}
          autoComplete="username"
        />
        <AuthField
          label="Password"
          type="password"
          value={form.password}
          onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between text-xs text-white/70">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm((prev) => ({ ...prev, remember: e.target.checked }))}
              className="h-4 w-4 rounded border-white/40 bg-transparent text-blue-400 focus:ring-blue-300"
            />
            Remember me
          </label>
          <button type="button" className="text-white/80 underline-offset-2 hover:underline">
            Forgot password?
          </button>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[999px] bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <p className="text-center text-sm text-white/80">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-white underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </AuthLayout>
  );
}
