import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import clsx from 'clsx';
import { useTheme } from '../../../state/useTheme';
import { withAlpha, mixWithWhite } from '../../utils/colors';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', disabled, children, ...props },
  ref,
) {
  const { primary, secondary } = useTheme();
  const baseClass = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  let variantClass = '';
  let styleOverride: CSSProperties = {};

  if (variant === 'primary') {
    variantClass = 'text-white';
    styleOverride = {
      backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})`,
      boxShadow: `0 10px 25px ${withAlpha(primary, 0.35)}`,
    };
  } else if (variant === 'ghost') {
    variantClass = 'bg-transparent';
    styleOverride = {
      color: mixWithWhite(primary, 0.4),
      border: `1px solid ${withAlpha(primary, 0.4)}`,
    };
  } else {
    variantClass = 'bg-red-600 text-white hover:bg-red-500';
  }

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={clsx(
        baseClass,
        variant === 'danger' ? 'focus-visible:outline-red-400' : 'focus-visible:outline-blue-500',
        variantClass,
        className,
      )}
      style={styleOverride}
      {...props}
    >
      {children}
    </button>
  );
});
