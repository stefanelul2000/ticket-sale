import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../state/useAuth';
import { useT } from '../../i18n';
import { errorMessage } from '../../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Misc';
import { Preferences } from '../components/Preferences';

/** Only same-app paths are allowed as redirect targets. */
const safeNext = (value: string | null) => (value && /^\/(?![\/\\])/.test(value) && !value.includes('\\') ? value : '/');

export function LoginPage() {
  const t = useT();
  const { login, loading, user, checked } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', remember: false });
  const [error, setError] = useState<string | null>(null);

  if (checked && user) return <Navigate to={safeNext(params.get('next'))} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(form.username.trim(), form.password, form.remember);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setError(errorMessage(err, t('auth.failed')));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sky opacity-10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/brand/as-mark-192.png" alt="" className="h-11 w-11 rounded-full bg-white p-1" />
          <span className="font-display text-xl font-bold">Atelier Săcelean</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-bold leading-tight">{t('login.heroTitle')}</h1>
          <p className="mt-4 text-lg text-white/80">{t('login.heroText')}</p>
        </div>
        <p className="relative text-sm text-white/60">{t('login.tagline')}</p>
      </div>

      <div className="flex flex-col bg-bg">
        <div className="flex justify-end p-4">
          <Preferences compact />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <Logo full size={112} className="mb-4" />
              <h2 className="text-2xl font-bold">{t('login.title')}</h2>
              <p className="mt-1 text-sm text-soft">{t('login.subtitle')}</p>
            </div>
            <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-card">
              <Input
                label={t('field.username')}
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                label={t('field.password')}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-soft">
                <input type="checkbox" checked={form.remember} onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))} className="h-4 w-4 accent-[var(--a-accent)]" />
                {t('login.remember')}
              </label>
              {error && <p className="rounded bg-dangerbg px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {t('auth.login')}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-soft">{t('login.help')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
