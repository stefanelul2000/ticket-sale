import { useState } from 'react';
import { api } from '../../../lib/api';
import { useTheme } from '../../../state/useTheme';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ThemeControls } from '../../components/ThemeControls';
import { inputStyle } from '../../styles';

type Props = {
  setView: (view: 'login' | 'app') => void;
  topbar: React.ReactNode;
  publicNav: React.ReactNode;
  user: any;
  logout: () => Promise<void> | void;
  setNeedsSetup: (needs: boolean) => void;
  setSetupSuccess: (success: boolean) => void;
  setToast: (toast: { id: number; message: string } | null) => void;
};

export function SetupView({
  setView,
  topbar,
  publicNav,
  user,
  logout,
  setNeedsSetup,
  setSetupSuccess,
  setToast,
}: Props) {
  const { setTheme, logoUrl } = useTheme();
  const [setupForm, setSetupForm] = useState({
    db_host: '',
    db_name: '',
    db_user: '',
    db_password: '',
    name: '',
    email: '',
    username: '',
    password: '',
    password_confirmation: '',
    mail_mailer: '',
    mail_host: '',
    mail_port: '',
    mail_username: '',
    mail_password: '',
    mail_from_address: '',
    mail_from_name: '',
  });
  const [setupError, setSetupError] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [setupLoading, setSetupLoading] = useState(false);
  const [dbStepLocked, setDbStepLocked] = useState(false);

  const emailInvalid =
    setupForm.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(setupForm.email);

  const passwordChecks = [
    { label: 'Min 12 characters', ok: setupForm.password.length >= 12 },
    { label: 'Upper & lower case', ok: /[a-z]/.test(setupForm.password) && /[A-Z]/.test(setupForm.password) },
    { label: 'Number', ok: /\d/.test(setupForm.password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(setupForm.password) },
    { label: 'Matches confirmation', ok: setupForm.password === setupForm.password_confirmation && setupForm.password.length > 0 },
  ];

  const mailHint = 'Optional: leave blank to log emails; fill to use SMTP.';

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSetup = async () => {
    setSetupError(null);
    try {
      await api.setup(setupForm);
      setNeedsSetup(false);
      setSetupSuccess(true);
      sessionStorage.setItem('setupChecked', '1');
      setView('login');
    } catch (err: any) {
      setSetupError(err.response?.data?.message || 'Setup failed');
    }
  };

  const handleLogoUpload = async (file: File) => {
    setSetupError(null);
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await api.uploadLogo(formData);
      setTheme({ logoUrl: res.url });
      setLogoFileName(file.name);
    } catch (err: any) {
      setSetupError(err.response?.data?.message || 'Logo upload failed');
    }
  };

  const steps = [
    {
      title: 'Database',
      content: (
        <div style={{ display: 'grid', gap: 10 }}>
          {['db_host', 'db_name', 'db_user', 'db_password'].map((field) => (
            <input
              key={field}
              type={field === 'db_password' ? 'password' : 'text'}
              placeholder={field.replace('db_', 'DB ').toUpperCase()}
              value={(setupForm as any)[field]}
              onChange={(e) => setSetupForm({ ...setupForm, [field]: e.target.value })}
              style={inputStyle}
            />
          ))}
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Example (Docker dev): host <code>db</code>, database <code>ticket_sale</code>, user
            <code>ticket_user</code>, password <code>ticket_pass</code>.
          </p>
        </div>
      ),
    },
    {
      title: 'Admin user',
      content: (
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            placeholder="Name"
            value={setupForm.name}
            onChange={(e) => setSetupForm({ ...setupForm, name: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Email"
            value={setupForm.email}
            onChange={(e) => setSetupForm({ ...setupForm, email: e.target.value })}
            style={inputStyle}
          />
          {emailInvalid && <div style={{ color: '#ff8c8c', fontSize: 13 }}>Please enter a valid email.</div>}
          <input
            placeholder="Username"
            value={setupForm.username}
            onChange={(e) => setSetupForm({ ...setupForm, username: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password (min 12 chars, mixed case, number, symbol)"
            value={setupForm.password}
            onChange={(e) => setSetupForm({ ...setupForm, password: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={setupForm.password_confirmation}
            onChange={(e) => setSetupForm({ ...setupForm, password_confirmation: e.target.value })}
            style={inputStyle}
          />
          <div style={{ display: 'grid', gap: 4 }}>
            {passwordChecks.map((rule) => (
              <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: rule.ok ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                <span>{rule.ok ? '✓' : '•'}</span>
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Mail (optional)',
      content: (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{mailHint}</div>
          <input
            placeholder="MAIL_MAILER (smtp/log)"
            value={(setupForm as any).mail_mailer || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_mailer: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="MAIL_HOST"
            value={(setupForm as any).mail_host || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_host: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="MAIL_PORT"
            value={(setupForm as any).mail_port || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_port: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="MAIL_USERNAME"
            value={(setupForm as any).mail_username || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_username: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="MAIL_PASSWORD"
            value={(setupForm as any).mail_password || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_password: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="MAIL_FROM_ADDRESS"
            value={(setupForm as any).mail_from_address || ''}
            onChange={(e) => setSetupForm({ ...setupForm, mail_from_address: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="MAIL_FROM_NAME"
            value={(setupForm as any).mail_from_name || setupForm.name}
            onChange={(e) => setSetupForm({ ...setupForm, mail_from_name: e.target.value })}
            style={inputStyle}
          />
        </div>
      ),
    },
    {
      title: 'Branding (optional)',
      content: (
        <div style={{ display: 'grid', gap: 12 }}>
          <ThemeControls allowed />
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ color: 'var(--muted)' }}>Logo URL</label>
            <input
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setTheme({ logoUrl: e.target.value })}
              style={inputStyle}
            />
            <label style={{ color: 'var(--muted)' }}>Or upload a logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                htmlFor="logo-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Upload
              </label>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                {logoFileName || 'No file chosen'}
              </span>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])}
              />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout header={user ? topbar : publicNav} onLogout={user ? logout : undefined}>
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {steps.map((step, idx) => (
            <div
              key={step.title}
              onClick={() => {
                if (
                  idx <= setupStep &&
                  idx !== setupStep &&
                  (!dbStepLocked || idx > 0)
                ) {
                  setSetupStep(idx);
                }
              }}
              style={{
                cursor:
                  idx <= setupStep && (!dbStepLocked || idx > 0) ? 'pointer' : 'not-allowed',
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: idx === setupStep ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                color:
                  idx <= setupStep && (!dbStepLocked || idx > 0)
                    ? 'var(--text)'
                    : 'rgba(255,255,255,0.3)',
                fontWeight: 600,
                opacity:
                  idx <= setupStep && (!dbStepLocked || idx > 0)
                    ? 1
                    : 0.5,
              }}
            >
              {idx + 1}. {step.title}
            </div>
          ))}
        </div>

        <Card title={steps[setupStep].title}>{steps[setupStep].content}</Card>

        {setupError && <div style={{ color: '#ff8c8c' }}>{setupError}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {setupStep > 0 ? (
            <Button
              variant="ghost"
              disabled={setupLoading || (dbStepLocked && setupStep === 1)}
              onClick={() =>
                setSetupStep((s) => {
                  const next = s - 1;
                  return dbStepLocked && next < 1 ? 1 : Math.max(0, next);
                })
              }
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {setupStep < steps.length - 1 ? (
            <Button
              disabled={setupLoading}
              onClick={async () => {
                if (setupStep === 0) {
                  setSetupError(null);
                  setSetupLoading(true);
                  try {
                    const res = await api.setupTestDb({
                      db_host: setupForm.db_host,
                      db_name: setupForm.db_name,
                      db_user: setupForm.db_user,
                      db_password: setupForm.db_password,
                    });
                    if (res?.ok) {
                      showToast('Database connected and migrations ran.');
                      setDbStepLocked(true);
                      setSetupStep((s) => Math.min(steps.length - 1, s + 1));
                    } else {
                      showToast(res?.message || 'DB test failed.');
                    }
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'DB test failed.';
                    setSetupError(msg);
                    showToast(msg);
                  } finally {
                    setSetupLoading(false);
                  }
                  return;
                }
                setSetupStep((s) => Math.min(steps.length - 1, s + 1));
              }}
            >
              {setupLoading ? 'Testing...' : 'Next'}
            </Button>
          ) : (
            <Button onClick={handleSetup} disabled={setupLoading}>
              {setupLoading ? 'Completing...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
