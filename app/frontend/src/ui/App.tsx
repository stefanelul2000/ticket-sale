import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { useTheme } from '../state/useTheme';
import { api } from '../lib/api';
import { SetupPage } from './pages/SetupPage';

export function App() {
  const { primary, secondary, background, logoUrl, setTheme } = useTheme();
  const [setupStatus, setSetupStatus] = useState<'checking' | 'needs' | 'ready' | 'unavailable'>('checking');
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
        // Never fall back to the setup wizard on errors: the server is just unreachable.
        setSetupStatus('unavailable');
      });
  }, []);

  if (setupStatus === 'unavailable') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
        <p className="text-lg font-semibold">Service temporarily unavailable</p>
        <p className="text-sm text-white/70">The server or its database is not reachable right now.</p>
        <button className="rounded-lg bg-white/10 px-4 py-2 text-sm" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

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
