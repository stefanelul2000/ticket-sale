import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../state/useTheme';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  onLogout?: () => Promise<void> | void;
};

type AccountMenuProps = { isMobile: boolean; show: boolean; toggle: () => void; onLogout?: () => Promise<void> | void };

export function Layout({ children, header, sidebar, onLogout }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { logoUrl } = useTheme();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Responsive flag
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 900);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const Brand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" style={{ height: 42, width: 42, objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            height: 42,
            width: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          }}
        />
      )}
      <div>
        <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>Ticket Sale</div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Event control center</div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        color: 'var(--text)',
        padding: isMobile ? 12 : 24,
      }}
    >
      <div
        className="layout-header"
        style={{
          maxWidth: isMobile ? '100%' : 'min(1320px, 100%)',
          margin: isMobile ? '0 0 12px' : '0 auto 16px',
          display: 'grid',
          gridTemplateColumns: '1fr auto', // Always 1fr auto to push right content to right
          alignItems: 'center',
          gap: 12,
          padding: isMobile ? '0' : '0 4px',
        }}
      >
        <div style={{ justifySelf: 'start' }}>{Brand}</div>
                  <div
                    style={{
                      justifySelf: 'end',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {sidebar && isMobile && (
                      <button
                        className="mobile-menu-btn"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setMobileNavOpen((v) => !v);
                          setShowMobileMenu(false);
                        }}
                        aria-label="Toggle navigation"
                      >
                        <span style={{ fontWeight: 700 }}>Menu</span>
                        <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--text)', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: -5, left: 0, right: 0, height: 2, background: 'var(--text)' }} />
                          <span style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'var(--text)' }} />
                        </span>
                      </button>
                    )}
                    {onLogout && ( // This is AccountMenu
                      <AccountMenu
                        isMobile={isMobile}
                        show={showMobileMenu}
                        toggle={() => setShowMobileMenu((v) => !v)}
                        onLogout={onLogout}
                      />
                    )}
                    {header && !isMobile && ( // Move header last, and only show on desktop
                      <div style={{ marginRight: 10 }}>
                        {header}
                      </div>
                    )}
                  </div>
        
      </div>
      <div
        className="layout-grid"
        style={{
          maxWidth: isMobile ? '100%' : 'min(1320px, 100%)',
          margin: isMobile ? '0' : '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : sidebar ? '260px 1fr' : '1fr',
          gap: isMobile ? 12 : 18,
          width: '100%',
        }}
      >
        {sidebar && (!isMobile || mobileNavOpen) && (
          <aside
            className={`surface sidebar ${mobileNavOpen ? 'open' : ''}`}
            style={{
              padding: isMobile ? 14 : 18,
              borderRadius: 18,
              display: 'grid',
              gap: 18,
              position: isMobile ? 'relative' : 'static',
              alignSelf: 'start',
              boxShadow: '0 18px 46px rgba(0,0,0,0.32)',
            }}
          >
            <div
              onClick={() => setMobileNavOpen(false)}
              style={{ display: 'grid', gap: 12 }}
            >
              {sidebar}
            </div>
          </aside>
        )}

        <main style={{ width: '100%', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function AccountMenu({ isMobile, show, toggle, onLogout }: AccountMenuProps) {
  const handleLogout = async () => {
    toggle();
    if (onLogout) {
      await onLogout();
    }
  };

  return (
    <div style={{ position: 'relative', marginLeft: isMobile ? 'auto' : 0 }}>
      <button
        onClick={toggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '8px 10px' : '10px 12px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--text)',
          cursor: 'pointer',
        }}
        aria-label="Account menu"
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="url(#gradUser)" />
          <path d="M12 12.5c1.93 0 3.5-1.57 3.5-3.5S13.93 5.5 12 5.5 8.5 7.07 8.5 9s1.57 3.5 3.5 3.5Zm0 1.5c-2.33 0-7 1.17-7 3.5V19h14v-1.5c0-2.33-4.67-3.5-7-3.5Z" fill="#111" />
          <defs>
            <linearGradient id="gradUser" x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#eef2f7" />
              <stop offset="1" stopColor="#d6deea" />
            </linearGradient>
          </defs>
        </svg>
      </button>
      {show && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: 'rgba(15,22,36,0.95)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 8,
            boxShadow: '0 16px 34px rgba(0,0,0,0.35)',
            minWidth: 140,
            zIndex: 20,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
