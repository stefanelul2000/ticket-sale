import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useSettings } from '../state/useSettings';
import { useT } from '../i18n';
import { Logo } from '../ui/components/ui/Misc';
import { Preferences } from '../ui/components/Preferences';

export function PublicLayout() {
  const t = useT();
  const { settings, load, loaded } = useSettings();

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="h-1.5 bg-sky" />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <a href={settings.website_url} className="flex items-center gap-3" rel="noopener">
            <Logo size={40} />
            <span className="font-display text-lg font-bold leading-tight">Atelier Săcelean</span>
          </a>
          <Preferences compact />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-sm text-soft">
          <span>© {new Date().getFullYear()} {settings.name}</span>
          <span className="flex gap-4">
            <Link to="/e" className="hover:text-ink">{t('public.allEvents')}</Link>
            <a href={settings.website_url} className="hover:text-ink" rel="noopener">{t('public.website')}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
