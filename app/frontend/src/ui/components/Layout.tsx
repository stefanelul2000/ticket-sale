import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTheme } from '../../state/useTheme';

type Props = {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
};

export function Layout({ children, header, sidebar }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { logoUrl } = useTheme();

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
        padding: 24,
      }}
    >
      {header && (
    <div
      className="layout-header"
      style={{
        maxWidth: 1320,
        margin: '0 auto 16px',
        display: 'grid',
        gridTemplateColumns: sidebar ? 'auto 1fr auto' : 'auto 1fr',
        gridAutoFlow: 'column',
        alignItems: 'start',
        justifyItems: 'center',
        gap: 12,
        padding: '0 4px',
      }}
    >
        <div style={{ justifySelf: 'start', alignSelf: 'start' }}>{Brand}</div>
        {sidebar ? (
          <div style={{ justifySelf: 'center', display: 'flex', justifyContent: 'center', alignSelf: 'start' }}>
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
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <span style={{ fontWeight: 700 }}>Menu</span>
              <span style={{ display: 'inline-block', width: 16, height: 2, background: 'var(--text)', position: 'relative' }}>
                <span style={{ position: 'absolute', top: -5, left: 0, right: 0, height: 2, background: 'var(--text)' }} />
                <span style={{ position: 'absolute', top: 5, left: 0, right: 0, height: 2, background: 'var(--text)' }} />
              </span>
            </button>
          </div>
        ) : (
          <div />
        )}
        <div style={{ justifySelf: 'end', alignSelf: 'start', display: 'flex', alignItems: 'center' }}>{header}</div>
      </div>
    )}
      <div
        className="layout-grid"
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: sidebar ? '260px 1fr' : '1fr',
          gap: 18,
        }}
      >
        {sidebar && (
          <aside
            className={`surface sidebar ${mobileNavOpen ? 'open' : ''}`}
            style={{
              padding: 18,
              borderRadius: 18,
              display: 'grid',
              gap: 18,
              position: 'static',
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

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
