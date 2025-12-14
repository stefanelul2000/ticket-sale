import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../../lib/api';
import { useTheme } from '../../state/useTheme';
import { useRoleId } from '../hooks/useRoleId';
import { useAuth } from '../../state/useAuth';

type BrandingState = {
  primary: string;
  secondary: string;
  background: string;
  logoUrl: string;
};

const defaultBranding: BrandingState = {
  primary: '#ff5c8d',
  secondary: '#43d9ad',
  background: '#0b0c10',
  logoUrl: '',
};

export function AdminBrandingPage() {
  const { user } = useAuth();
  const roleId = useRoleId();
  const canAdmin = roleId >= 5 && !user?.impersonating;
  const [values, setValues] = useState<BrandingState>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { setTheme } = useTheme();
  const updateColor = (key: keyof BrandingState, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;
    if (!canAdmin) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    api
      .branding()
      .then((payload) => {
        if (!mounted) return;
        const nextValues = { ...defaultBranding, ...(payload || {}) };
        setValues(nextValues);
        setTheme(nextValues);
      })
      .catch(() => setError('Failed to load branding settings.'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [canAdmin, setTheme]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        primary: values.primary,
        secondary: values.secondary,
        background: values.background,
        logoUrl: values.logoUrl,
      };
      await api.saveBranding(payload);
      setTheme(payload);
      setMessage('Branding updated.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  if (!canAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Branding</h1>
          <p className="text-sm text-slate-400">Update the colors and logo that style the public experience.</p>
        </div>
        <Card title="Restricted">
          <p className="text-sm text-slate-400">
            Only administrators (not impersonating) can edit branding. Stop impersonation or contact a site owner.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleLogoFile = async (file?: File | null) => {
    if (!file) return;
    setUploadingLogo(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.uploadLogo(formData);
      const url = res?.url ?? res?.logoUrl ?? values.logoUrl;
      setValues((prev) => ({ ...prev, logoUrl: url || prev.logoUrl }));
      setTheme({ logoUrl: url });
      setMessage('Logo uploaded.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const colorFields: Array<{ key: keyof BrandingState; label: string }> = [
    { key: 'primary', label: 'Primary color' },
    { key: 'secondary', label: 'Secondary color' },
    { key: 'background', label: 'Background color' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Branding</h1>
        <p className="text-sm text-slate-400">Update the colors and logo that style the public experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Theme colors" actions={saving ? <Spinner size="sm" /> : null}>
          <div className="grid gap-4 md:grid-cols-3">
            {colorFields.map((field) => {
              const value = values[field.key];
              return (
                <div key={field.key}>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</label>
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <input
                      type="color"
                      className="h-12 w-12 rounded-full border border-slate-700 bg-transparent p-0"
                      value={value}
                      onChange={(e) => updateColor(field.key, e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-white"
                      value={value}
                      onChange={(e) => updateColor(field.key, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Brand assets">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={values.logoUrl}
              onChange={(e) => setValues((prev) => ({ ...prev, logoUrl: e.target.value }))}
            />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="branding-logo-upload">
                Upload logo
              </label>
              <input
                id="branding-logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="mt-2 w-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                disabled={uploadingLogo}
              />
              {uploadingLogo && <p className="mt-2 text-xs text-slate-400">Uploading logo…</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Preview</p>
            <div
              className="mt-3 flex items-center gap-4 rounded-2xl px-4 py-6"
              style={{ background: values.background, color: values.primary }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold"
                style={{ color: values.secondary }}
              >
                {values.logoUrl ? (
                  <img src={values.logoUrl} alt="Logo preview" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  'TS'
                )}
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: values.primary }}>
                  Ticket Sale
                </p>
                <p className="text-sm" style={{ color: values.secondary }}>
                  Custom branding preview
                </p>
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-green-300">{message}</p>}

        <Button type="submit" className="w-full md:w-auto" disabled={saving}>
          {saving ? 'Saving…' : 'Save branding'}
        </Button>
      </form>
    </div>
  );
}
