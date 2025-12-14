import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../state/useAuth';
import { useTheme } from '../state/useTheme';
import { withAlpha, mixWithWhite } from '../ui/utils/colors';
import { Button } from '../ui/components/ui/Button';

const coreNav = [
  { to: '/dashboard', label: 'Dashboard', minRole: 1 },
  { to: '/events', label: 'Events', minRole: 4 },
  { to: '/tickets', label: 'Tickets', minRole: 2 },
];

const adminNav = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/roles', label: 'Roles' },
  { to: '/admin/branding', label: 'Branding' },
  { to: '/admin/impersonation', label: 'Impersonation' },
];

export function AppLayout() {
  const { user, logout, stopImpersonation } = useAuth();
  const { logoUrl, primary, secondary, background } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const roleValue = user?.role?.id ?? user?.role_id ?? 0;
  const canAccessAdmin = !user?.impersonating && roleValue >= 5;
  const [adminMenuOpen, setAdminMenuOpen] = useState(canAccessAdmin && location.pathname.startsWith('/admin'));
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

  useEffect(() => {
    if (!canAccessAdmin) return;
    setAdminMenuOpen(location.pathname.startsWith('/admin'));
  }, [location.pathname, canAccessAdmin]);

  const handleStopImpersonation = async () => {
    setStoppingImpersonation(true);
    try {
      await stopImpersonation();
    } catch {
      // ignore
    } finally {
      setStoppingImpersonation(false);
    }
  };

  const shellBackground = mixWithWhite(background, 0.05);
  const panelBackground = withAlpha(background, 0.9);

  return (
    <div className="flex min-h-screen text-slate-100" style={{ backgroundColor: shellBackground }}>
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 border-r p-6 transition-transform lg:static lg:block lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none',
        )}
        style={{
          backgroundColor: panelBackground,
          borderColor: withAlpha('#ffffff', 0.06),
        }}
      >
        <div className="flex h-full flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white">
              {logoUrl ? <img src={logoUrl} alt="Brand logo" className="h-12 w-12 rounded-2xl object-cover" /> : 'TS'}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Ticket Sale</p>
              <p className="text-sm text-slate-400">Control Center</p>
            </div>
          </div>
          <nav className="space-y-2 overflow-y-auto">
            {coreNav
              .filter((item) => roleValue >= item.minRole)
              .map((item) => (
                <NavLink
                  key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'block rounded-xl px-4 py-2 text-sm font-semibold transition',
                    isActive ? 'text-white shadow-lg' : 'text-slate-300',
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? `linear-gradient(135deg, ${primary}, ${secondary})` : withAlpha('#ffffff', 0.02),
                  border: `1px solid ${withAlpha('#ffffff', 0.06)}`,
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {canAccessAdmin && (
            <div className="mt-6 space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border px-4 py-2 text-left text-sm font-semibold text-slate-200"
                style={{
                  borderColor: withAlpha('#ffffff', 0.08),
                  backgroundColor: withAlpha(background, 0.6),
                }}
                onClick={() => setAdminMenuOpen((open) => !open)}
              >
                <span>Admin</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={clsx('h-4 w-4 transition', adminMenuOpen ? 'rotate-180' : '')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {adminMenuOpen && (
                <div
                  className="space-y-1 rounded-2xl border p-2"
                  style={{
                    borderColor: withAlpha('#ffffff', 0.08),
                    backgroundColor: withAlpha(background, 0.4),
                  }}
                >
                  {adminNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        clsx('block rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'text-white shadow-lg' : 'text-slate-300')
                      }
                      style={({ isActive }) => ({
                        backgroundColor: isActive ? withAlpha(primary, 0.8) : withAlpha(background, 0.6),
                      })}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}
      <div className="flex flex-1 flex-col" style={{ backgroundColor: mixWithWhite(background, 0.05) }}>
        <header
          className="flex h-16 items-center justify-between border-b px-4 lg:px-8"
          style={{
            backgroundColor: withAlpha(background, 0.92),
            borderColor: withAlpha('#ffffff', 0.08),
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-300 lg:hidden"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                borderColor: withAlpha(primary, 0.3),
                boxShadow: `0 10px 25px ${withAlpha(primary, 0.4)}`,
              }}
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 8h16M4 16h16" />
              </svg>
              <span>Menu</span>
            </button>
            <div className="text-base font-semibold lg:hidden">Ticket Sale</div>
          </div>
          <div className="flex items-center gap-3">
            {user?.impersonating && (
              <Button
                variant="ghost"
                className="text-xs font-semibold"
                style={{
                  borderColor: withAlpha(primary, 0.4),
                  color: mixWithWhite(primary, 0.5),
                }}
                onClick={handleStopImpersonation}
                disabled={stoppingImpersonation}
              >
                {stoppingImpersonation ? 'Stopping…' : 'Stop impersonation'}
              </Button>
            )}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm font-semibold text-white shadow"
                style={{
                  borderColor: withAlpha('#ffffff', 0.1),
                  backgroundColor: withAlpha(background, 0.6),
                }}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
                <span className="hidden md:block">{user?.name ?? 'Unknown User'}</span>
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl border p-4 text-sm shadow-2xl"
                  style={{
                    borderColor: withAlpha('#ffffff', 0.1),
                    backgroundColor: withAlpha(background, 0.95),
                  }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <strong className="block text-base text-white">{user?.name ?? 'Unknown User'}</strong>
                      <span className="text-xs text-slate-400">@{user?.username ?? 'unknown'}</span>
                    </div>
                  </div>
                  <hr className="my-3 border-slate-800/60" />
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                    }}
                    onClick={() => {
                      setProfileOpen(false);
                      logout().catch(() => {});
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-8"
          style={{ backgroundColor: withAlpha(background, 0.3) }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
