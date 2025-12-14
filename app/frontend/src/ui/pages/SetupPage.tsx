import { type FormEvent, useState } from 'react';
import { api } from '../../lib/api';

const inputClass =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none';

const steps = ['Database', 'Administrator', 'Email', 'Branding'];

const defaultDbForm = { host: 'db', name: 'ticket_sale', user: 'ticket_user', password: '' };
const defaultAdminForm = { name: '', email: '', username: '', password: '', confirm: '' };
const defaultMailForm = { mailer: 'log', host: '', port: '', username: '', password: '', fromAddress: '', fromName: '' };
const defaultBranding = { primary: '#2563eb', secondary: '#f472b6', background: '#0f172a' };

export function SetupPage({ onSuccess, skipDb = false }: { onSuccess: () => void; skipDb?: boolean }) {
  const [currentStep, setCurrentStep] = useState(skipDb ? 1 : 0);
  const [dbForm, setDbForm] = useState(defaultDbForm);
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [dbMessage, setDbMessage] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [mailForm, setMailForm] = useState(defaultMailForm);
  const [branding, setBranding] = useState(defaultBranding);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<{ admin?: string; email?: string; branding?: string }>({});

  const testDatabase = async () => {
    if (skipDb) {
      setDbStatus('success');
      setDbMessage('Database already provisioned. Continue to the next step.');
      return;
    }
    setDbStatus('testing');
    setDbMessage(null);
    try {
      await api.setupTestDb({
        db_host: dbForm.host,
        db_name: dbForm.name,
        db_user: dbForm.user,
        db_password: dbForm.password,
      });
      setDbStatus('success');
      setDbMessage('Connection successful. Database is reachable.');
    } catch (err: any) {
      setDbStatus('error');
      setDbMessage(err?.response?.data?.message || 'Connection failed. Verify credentials.');
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      if (currentStep === 1) {
        setStepErrors((prev) => ({ ...prev, admin: undefined }));
      }
      if (currentStep === 2) {
        setStepErrors((prev) => ({ ...prev, email: undefined }));
      }
      if (currentStep === 3) {
        setStepErrors((prev) => ({ ...prev, branding: undefined }));
      }
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      if (skipDb) {
        return (
          <section>
            <h2 className="text-lg font-semibold">Step 1 — Database</h2>
            <p className="text-sm text-white/70">
              Database provisioning has already been completed. Continue to create the administrator account.
            </p>
            <button
              type="button"
              onClick={nextStep}
              className="mt-4 rounded-full bg-white px-6 py-2 text-sm font-semibold text-indigo-900"
            >
              Continue
            </button>
          </section>
        );
      }
      return skipDb ? true : dbStatus === 'success';
    }
    if (currentStep === 1) {
      return (
        adminForm.name.trim() &&
        adminForm.email.trim() &&
        adminForm.username.trim() &&
        adminForm.password.length >= 12 &&
        adminForm.password === adminForm.confirm
      );
    }
    return true;
  };

  const handleComplete = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setStepErrors({});
    try {
      await api.setup({
        db_host: dbForm.host,
        db_name: dbForm.name,
        db_user: dbForm.user,
        db_password: dbForm.password,
        name: adminForm.name,
        email: adminForm.email,
        username: adminForm.username,
        password: adminForm.password,
        password_confirmation: adminForm.confirm,
        mail_mailer: mailForm.mailer,
        mail_host: mailForm.host,
        mail_port: mailForm.port ? Number(mailForm.port) : undefined,
        mail_username: mailForm.username,
        mail_password: mailForm.password,
        mail_from_address: mailForm.fromAddress,
        mail_from_name: mailForm.fromName || adminForm.name,
        branding_primary: branding.primary,
        branding_secondary: branding.secondary,
        branding_background: branding.background,
      });
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        try {
          await api.uploadLogo(formData);
          setLogoMessage('Logo uploaded successfully.');
        } catch (err) {
          console.warn('Logo upload failed', err);
          setLogoMessage('Logo upload requires authentication; you can upload it later under Admin → Branding.');
        }
      }
      setSuccess('Setup complete! Review the summary below and continue when ready.');
      setCompleted(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Setup failed. Please review the steps and try again.';
      setError(message);
      const validation = err?.response?.data?.errors;
      if (validation) {
        if (validation.password || validation.username || validation.email || validation.name) {
          setStepErrors((prev) => ({ ...prev, admin: validation.password?.[0] || validation.username?.[0] || validation.email?.[0] || validation.name?.[0] }));
          setCurrentStep(1);
        } else if (validation.mail_host || validation.mail_port || validation.mail_mailer) {
          setStepErrors((prev) => ({ ...prev, email: validation.mail_host?.[0] || validation.mail_port?.[0] || validation.mail_mailer?.[0] }));
          setCurrentStep(2);
        } else if (validation.branding_primary || validation.branding_secondary || validation.branding_background) {
          setStepErrors((prev) => ({
            ...prev,
            branding: validation.branding_primary?.[0] || validation.branding_secondary?.[0] || validation.branding_background?.[0],
          }));
          setCurrentStep(3);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <section>
          <h2 className="text-lg font-semibold">Step 1 — Database</h2>
          <p className="text-sm text-white/70">Connect to the MySQL database that will store tickets, events, and users.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Host
              <input className={inputClass} value={dbForm.host} onChange={(e) => setDbForm((prev) => ({ ...prev, host: e.target.value }))} required />
            </label>
            <label className="text-sm text-white/80">
              Database
              <input className={inputClass} value={dbForm.name} onChange={(e) => setDbForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </label>
            <label className="text-sm text-white/80">
              User
              <input className={inputClass} value={dbForm.user} onChange={(e) => setDbForm((prev) => ({ ...prev, user: e.target.value }))} required />
            </label>
            <label className="text-sm text-white/80">
              Password
              <input
                className={inputClass}
                type="password"
                value={dbForm.password}
                onChange={(e) => setDbForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>
          </div>
          <button
            type="button"
            onClick={testDatabase}
            className="mt-4 rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/25"
            disabled={dbStatus === 'testing'}
          >
            {dbStatus === 'testing' ? 'Testing connection…' : 'Test connection'}
          </button>
          {dbMessage && (
            <p className={`mt-3 rounded-lg px-4 py-2 text-sm ${dbStatus === 'success' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}`}>
              {dbMessage}
            </p>
          )}
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section>
          <h2 className="text-lg font-semibold">Step 2 — Administrator</h2>
          <p className="text-sm text-white/70">Create the initial site owner account. Use a strong password (min 12 chars).</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Full name
              <input
                className={inputClass}
                value={adminForm.name}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-white/80">
              Email
              <input
                className={inputClass}
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-white/80">
              Username
              <input
                className={inputClass}
                value={adminForm.username}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm text-white/80">
              Password
              <input
                className={inputClass}
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
              <p className="mt-1 text-xs text-white/60">At least 12 characters with uppercase, lowercase, numbers, and symbols.</p>
            </label>
            <label className="text-sm text-white/80">
              Confirm password
              <input
                className={inputClass}
                type="password"
                value={adminForm.confirm}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, confirm: e.target.value }))}
                required
              />
              {adminForm.confirm && adminForm.password !== adminForm.confirm && (
                <p className="mt-1 text-xs text-red-200">Passwords do not match.</p>
              )}
            </label>
          </div>
          {stepErrors.admin && <p className="mt-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-100">{stepErrors.admin}</p>}
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section>
          <h2 className="text-lg font-semibold">Step 3 — Email (optional)</h2>
          <p className="text-sm text-white/70">Configure SMTP if you plan to send password resets. Leave blank to keep logging mode.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Mailer
              <input className={inputClass} value={mailForm.mailer} onChange={(e) => setMailForm((prev) => ({ ...prev, mailer: e.target.value }))} />
            </label>
            <label className="text-sm text-white/80">
              Host
              <input className={inputClass} value={mailForm.host} onChange={(e) => setMailForm((prev) => ({ ...prev, host: e.target.value }))} />
            </label>
            <label className="text-sm text-white/80">
              Port
              <input className={inputClass} value={mailForm.port} onChange={(e) => setMailForm((prev) => ({ ...prev, port: e.target.value }))} />
            </label>
            <label className="text-sm text-white/80">
              Username
              <input className={inputClass} value={mailForm.username} onChange={(e) => setMailForm((prev) => ({ ...prev, username: e.target.value }))} />
            </label>
            <label className="text-sm text-white/80">
              Password
              <input
                className={inputClass}
                type="password"
                value={mailForm.password}
                onChange={(e) => setMailForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </label>
            <label className="text-sm text-white/80">
              From address
              <input
                className={inputClass}
                value={mailForm.fromAddress}
                onChange={(e) => setMailForm((prev) => ({ ...prev, fromAddress: e.target.value }))}
              />
            </label>
            <label className="text-sm text-white/80">
              From name
              <input className={inputClass} value={mailForm.fromName} onChange={(e) => setMailForm((prev) => ({ ...prev, fromName: e.target.value }))} />
            </label>
          </div>
          {stepErrors.email && <p className="mt-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-100">{stepErrors.email}</p>}
        </section>
      );
    }

    return (
      <section>
        <h2 className="text-lg font-semibold">Step 4 — Branding</h2>
        <p className="text-sm text-white/70">Pick initial colors for the dashboard. You can change them later inside the app.</p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <label className="text-sm text-white/80 flex flex-col gap-2">
            Primary color
            <input
              type="color"
              className="h-12 w-full cursor-pointer rounded-lg border border-white/25 bg-transparent"
              value={branding.primary}
              onChange={(e) => setBranding((prev) => ({ ...prev, primary: e.target.value }))}
            />
          </label>
          <label className="text-sm text-white/80 flex flex-col gap-2">
            Secondary color
            <input
              type="color"
              className="h-12 w-full cursor-pointer rounded-lg border border-white/25 bg-transparent"
              value={branding.secondary}
              onChange={(e) => setBranding((prev) => ({ ...prev, secondary: e.target.value }))}
            />
          </label>
          <label className="text-sm text-white/80 flex flex-col gap-2">
            Background
            <input
              type="color"
              className="h-12 w-full cursor-pointer rounded-lg border border-white/25 bg-transparent"
              value={branding.background}
              onChange={(e) => setBranding((prev) => ({ ...prev, background: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Logo (optional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-white/60">PNG/JPG/SVG up to 2 MB.</p>
            {logoFile && <p className="mt-2 text-xs text-emerald-200">Selected: {logoFile.name}</p>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Preview
            <div
              className="mt-3 rounded-xl p-6 text-white shadow-lg"
              style={{
                background: branding.background,
                borderColor: branding.secondary,
              }}
            >
              <p style={{ color: branding.secondary }}>Ticket Sale</p>
              <p className="text-lg font-semibold" style={{ color: branding.primary }}>
                Welcome to your dashboard preview
              </p>
            </div>
          </div>
        </div>
        {logoMessage && <p className="mt-4 rounded-md bg-amber-500/20 px-4 py-2 text-sm text-amber-100">{logoMessage}</p>}
        {stepErrors.branding && <p className="mt-4 rounded-md bg-red-500/20 px-4 py-2 text-sm text-red-100">{stepErrors.branding}</p>}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white">
      <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <header className="mb-8 text-center">
          <p className="text-sm uppercase tracking-wide text-white/70">Ticket Sale</p>
          <h1 className="mt-2 text-3xl font-semibold">Initial Setup</h1>
          <p className="mt-3 text-white/70">Complete the {steps.length} steps below to provision the app.</p>
          <div className="mt-6 flex justify-center gap-3">
            {steps.map((label, index) => (
              <div
                key={label}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-medium ${
                  index === currentStep ? 'bg-white text-indigo-800' : index < currentStep ? 'bg-emerald-400 text-emerald-900' : 'bg-white/20 text-white/70'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-white/70">{steps[currentStep]}</p>
        </header>

        <form className="space-y-8" onSubmit={handleComplete}>
          {renderStep()}

          {error && <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-100">{error}</p>}
          {success && <p className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-100">{success}</p>}

          <div className="flex flex-wrap items-center justify-between gap-4">
            {completed ? (
              <button
                type="button"
                onClick={onSuccess}
                className="ml-auto rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:opacity-90"
              >
                Enter the application
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={currentStep === 0}
                  className="rounded-full border border-white/30 px-6 py-2 text-sm text-white/80 disabled:opacity-50"
                >
                  Back
                </button>
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-indigo-900 disabled:opacity-40"
                  >
                    Next step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-900/40 disabled:opacity-50"
                  >
                    {submitting ? 'Provisioning…' : 'Finish setup'}
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
