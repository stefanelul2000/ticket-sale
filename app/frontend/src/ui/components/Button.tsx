import type { ButtonHTMLAttributes } from 'react';
import cx from 'classnames';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost';
};

export function Button({ variant = 'solid', className, ...rest }: Props) {
  return (
    <button
      className={cx(className)}
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        border: variant === 'ghost' ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
        background:
          variant === 'solid'
            ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
            : 'rgba(255,255,255,0.06)',
        color: variant === 'solid' ? '#0b101a' : 'var(--text)',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 0.1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: variant === 'solid' ? '0 10px 30px rgba(0,0,0,0.25)' : 'none',
      }}
      {...rest}
    />
  );
}
