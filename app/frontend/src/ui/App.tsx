import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { useTheme } from '../state/useTheme';
import { api } from '../lib/api';

export function App() {
  const { primary, secondary, background, logoUrl, setTheme } = useTheme();

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

  return <RouterProvider router={router} />;
}
