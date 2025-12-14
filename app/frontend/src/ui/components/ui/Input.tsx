import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const inputId = id || props.name;
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-200" htmlFor={inputId}>
      {label && <span>{label}</span>}
      <input
        id={inputId}
        ref={ref}
        className={clsx(
          'w-full rounded-xl border bg-slate-950/70 px-4 py-2 text-base text-white shadow-inner transition placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40',
          error ? 'border-red-500/70' : 'border-slate-800',
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </label>
  );
});
