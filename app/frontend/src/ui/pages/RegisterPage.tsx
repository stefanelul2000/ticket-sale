import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { api } from '../../lib/api';

const iconPaths: Record<string, string> = {
  name: 'M5 7h14M5 12h14M5 17h7',
  email: 'M16 12a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0v1a4 4 0 008 0v-1a9 9 0 10-18 0v1a4 4 0 008 0v-1',
  username: 'M5.121 17.804A4 4 0 017 16h10a4 4 0 011.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  password: 'M12 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zM5 20a7 7 0 0114 0',
};

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
  const path = iconPaths[type === 'password' ? 'password' : label.toLowerCase()] ?? iconPaths.username;
  return (
    <label className="block text-sm text-white/70">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner shadow-black/20 focus-within:border-blue-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d={path} />
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

export function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      await api.register(form);
      setStatus('Registration submitted for approval.');
      setForm({ name: '', email: '', username: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join the Ticket Sale workspace">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField label="Full name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} autoComplete="name" />
        <AuthField
          label="Email"
          value={form.email}
          onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          type="email"
          autoComplete="email"
        />
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
          autoComplete="new-password"
        />
        <AuthField
          label="Confirm password"
          type="password"
          value={form.password_confirmation}
          onChange={(value) => setForm((prev) => ({ ...prev, password_confirmation: value }))}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        {status && <p className="text-sm text-green-300">{status}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[999px] bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Register'}
        </button>
      </form>
      <p className="text-center text-sm text-white/80">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
