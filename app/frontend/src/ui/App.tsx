import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { useTheme } from '../state/useTheme';
import { api } from '../lib/api';
import { SetupPage } from './pages/SetupPage';

export function App() {
  const { primary, secondary, background, logoUrl, setTheme } = useTheme();
  const [setupStatus, setSetupStatus] = useState<'checking' | 'needs' | 'ready'>('checking');
  const [setupMeta, setSetupMeta] = useState<{ skipDb: boolean }>({ skipDb: false });

  useEffect(() => {
    api
      .branding()
      .then((payload) => {
        if (payload) {
          setTheme(payload);
        }
      })
      .catch(() => {
        // ignore branding fetch errors
      });
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', background);
    root.style.setProperty('--accent', primary);
    root.style.setProperty('--accent-2', secondary);
    root.style.setProperty('--logo-url', logoUrl || '');
    document.body.style.background = background;
  }, [primary, secondary, background, logoUrl]);

  useEffect(() => {
    api
      .setupStatus()
      .then((payload) => {
        if (payload.needsSetup) {
          setSetupMeta({ skipDb: Boolean(payload.setupDisabled) });
          setSetupStatus('needs');
        } else {
          setSetupStatus('ready');
        }
      })
      .catch(() => {
        setSetupStatus('needs');
      });
  }, []);

  if (setupStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm tracking-wide text-white/70">Checking environment…</p>
      </div>
    );
  }

  if (setupStatus === 'needs') {
    return <SetupPage skipDb={setupMeta.skipDb} onSuccess={() => setSetupStatus('ready')} />;
  }

  return <RouterProvider router={router} />;
}
