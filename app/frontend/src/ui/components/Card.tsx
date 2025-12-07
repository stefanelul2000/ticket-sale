import type { ReactNode } from 'react';

type Props = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  titleAlign?: 'left' | 'center' | 'right';
};

export function Card({ title, action, children, titleAlign = 'left' }: Props) {
  return (
    <div className="surface" style={{ padding: 16, borderRadius: 14, border: '1px solid var(--border)' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: titleAlign === 'center' ? 'center' : 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, width: '100%', textAlign: titleAlign }}>{title}</h3>
          {action}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
