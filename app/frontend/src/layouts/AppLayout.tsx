import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth, useRealRoleId, useRoleId } from '../state/useAuth';
import { useT } from '../i18n';
import type { TKey } from '../i18n';
import { roleKey } from '../lib/constants';
import { Logo } from '../ui/components/ui/Misc';
import { Preferences } from '../ui/components/Preferences';
import { Button } from '../ui/components/ui/Button';
import { IconCalendar, IconChart, IconHome, IconLogout, IconMenu, IconScan, IconSettings, IconTicket, IconUsers } from '../ui/components/Icons';

type NavItem = { to: string; label: TKey; icon: ComponentType<{ size?: number }>; allow: (role: number) => boolean; end?: boolean };

export const NAV: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: IconHome, allow: () => true, end: true },
  { to: '/door', label: 'nav.door', icon: IconScan, allow: (r) => r >= 2 && r !== 3 },
  { to: '/assign', label: 'nav.assign', icon: IconTicket, allow: (r) => r >= 3 },
  { to: '/events', label: 'nav.events', icon: IconCalendar, allow: (r) => r >= 4 },
  { to: '/reports', label: 'nav.reports', icon: IconChart, allow: (r) => r >= 1 },
  { to: '/users', label: 'nav.users', icon: IconUsers, allow: (r) => r >= 5 },
  { to: '/settings', label: 'nav.settings', icon: IconSettings, allow: (r) => r >= 5 },
];

export function AppLayout() {
  const t = useT();
  const { user, logout, stopImpersonation } = useAuth();
  const role = useRoleId();
  const realRole = useRealRoleId();
  const [open, setOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const items = NAV.filter((n) => n.allow(role));

  const doLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Logo size={44} />
        <div className="leading-tight">
          <div className="font-display text-lg font-bold">Atelier Săcelean</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">{t('app.subtitle')}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label={t('nav.main')}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-accenttint text-accent' : 'text-soft hover:bg-surface2 hover:text-ink',
              )
            }
          >
            <item.icon size={19} />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-line p-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{user?.name}</div>
          <div className="truncate text-xs text-soft">{t(roleKey(realRole))}</div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Preferences />
          <button type="button" onClick={doLogout} className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm font-semibold text-soft hover:bg-surface2 hover:text-ink">
            <IconLogout size={16} /> {t('auth.logout')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>

      {/* mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display font-bold">Atelier Săcelean</span>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded p-2 text-ink hover:bg-surface2" aria-label={t('nav.menu')}>
          <IconMenu />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 max-w-[85vw] bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {user?.impersonating && (
          <div className="flex flex-wrap items-center justify-center gap-3 bg-warnbg px-4 py-2 text-sm font-semibold text-warn">
            {t('imp.banner', { role: t(roleKey(role)) })}
            <Button
              size="sm"
              variant="secondary"
              loading={stopping}
              onClick={async () => {
                setStopping(true);
                try {
                  await stopImpersonation();
                } finally {
                  setStopping(false);
                }
              }}
            >
              {t('imp.stop')}
            </Button>
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
