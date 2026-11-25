import { useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../state/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Misc';
import { Preferences } from '../components/Preferences';

export function SetupPage({ needsDb, onDone }: { needsDb: boolean; onDone: () => void }) {
  const t = useT();
  const [f, setF] = useState({ db_host: 'db', db_name: 'ticket_sale', db_user: 'ticket_user', db_password: '', name: '', email: '', username: '', password: '', password_confirmation: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { db_host, db_name, db_user, db_password, ...admin } = f;
      await api.setup(needsDb ? { db_host, db_name, db_user, db_password, ...admin } : admin);
      await useAuth.getState().refresh();
      onDone();
    } catch (err) {
      setError(errorMessage(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex justify-end p-4"><Preferences compact /></div>
      <div className="mx-auto max-w-lg px-4 pb-16">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo full size={96} className="mb-3" />
          <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
          <p className="mt-1 text-sm text-soft">{t('setup.subtitle')}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-card">
          {needsDb && (
            <div className="space-y-4 rounded-lg bg-surface2 p-4">
              <h2 className="font-bold">{t('setup.database')}</h2>
              <Input label="Host" value={f.db_host} onChange={set('db_host')} required />
              <Input label={t('setup.dbName')} value={f.db_name} onChange={set('db_name')} required />
              <Input label={t('field.username')} value={f.db_user} onChange={set('db_user')} required />
              <Input label={t('field.password')} type="password" value={f.db_password} onChange={set('db_password')} />
            </div>
          )}
          <h2 className="font-bold">{t('setup.owner')}</h2>
          <Input label={t('field.name')} value={f.name} onChange={set('name')} required />
          <Input label="Email" type="email" value={f.email} onChange={set('email')} required />
          <Input label={t('field.username')} value={f.username} onChange={set('username')} required autoCapitalize="none" />
          <Input label={t('field.password')} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required minLength={12} hint={t('setup.passwordHint')} />
          <Input label={t('setup.confirm')} type="password" autoComplete="new-password" value={f.password_confirmation} onChange={set('password_confirmation')} required />
          {error && <p className="rounded bg-dangerbg px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={saving}>{t('setup.submit')}</Button>
        </form>
      </div>
    </div>
  );
}
