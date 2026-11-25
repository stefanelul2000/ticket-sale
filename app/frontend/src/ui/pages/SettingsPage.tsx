import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { useSettings } from '../../state/useSettings';
import { toast } from '../../state/useToast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Loading, PageHeader } from '../components/ui/Misc';

type Org = { name: string; website_url: string; donation_url: string; public_url: string };

export function SettingsPage() {
  const t = useT();
  const [form, setForm] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then(setForm).catch((err) => toast(errorMessage(err, t('common.error')), 'danger'));
  }, [t]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const saved = await api.saveSettings({ ...form, public_url: form.public_url.replace(/\/+$/, '') });
      setForm(saved);
      useSettings.getState().set(saved);
      toast(t('common.saved'), 'ok');
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      {!form ? (
        <Loading />
      ) : (
        <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
          <Card title={t('settings.org')} className="lg:col-span-2">
            <div className="space-y-4">
              <Input label={t('settings.orgName')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label={t('field.websiteUrl')} type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              <Input label={t('settings.donationDefault')} type="url" value={form.donation_url} onChange={(e) => setForm({ ...form, donation_url: e.target.value })} hint={t('settings.donationHint')} />
              <Input label={t('settings.publicUrl')} type="url" required value={form.public_url} onChange={(e) => setForm({ ...form, public_url: e.target.value })} hint={t('settings.publicUrlHint')} />
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>{t('common.save')}</Button>
              </div>
            </div>
          </Card>
          <Card title={t('settings.qrTitle')}>
            <p className="text-sm text-soft">{t('settings.qrText')}</p>
            <code className="mt-3 block truncate rounded bg-surface2 px-2 py-1.5 text-xs">{form.public_url.replace(/\/+$/, '')}/t/K7M3P-9QXR2</code>
            <p className="mt-3 text-sm font-semibold text-warn">{t('settings.qrWarn')}</p>
          </Card>
        </form>
      )}
    </div>
  );
}
