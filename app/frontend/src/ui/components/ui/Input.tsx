import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

const control =
  'w-full rounded border border-linestrong bg-surface px-3 text-ink placeholder:text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accenttint disabled:opacity-60';

type FieldProps = { label?: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string; children: ReactNode; htmlFor?: string };

export function Field({ label, hint, error, className, children, htmlFor }: FieldProps) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-soft">{hint}</p>}
      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; error?: ReactNode; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, wrapperClassName, id, ...props },
  ref,
) {
  const auto = useId();
  const inputId = id || props.name || auto;
  return (
    <Field label={label} hint={hint} error={error} className={wrapperClassName} htmlFor={inputId}>
      <input id={inputId} ref={ref} className={clsx(control, 'h-10', error && 'border-danger', className)} {...props} />
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; wrapperClassName?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, className, wrapperClassName, id, children, ...props },
  ref,
) {
  const auto = useId();
  const selectId = id || props.name || auto;
  return (
    <Field label={label} hint={hint} className={wrapperClassName} htmlFor={selectId}>
      <select id={selectId} ref={ref} className={clsx(control, 'select h-10', className)} {...props}>
        {children}
      </select>
    </Field>
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; hint?: ReactNode; wrapperClassName?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, className, wrapperClassName, id, ...props },
  ref,
) {
  const auto = useId();
  const areaId = id || props.name || auto;
  return (
    <Field label={label} hint={hint} className={wrapperClassName} htmlFor={areaId}>
      <textarea id={areaId} ref={ref} className={clsx(control, 'min-h-[96px] py-2', className)} {...props} />
    </Field>
  );
});

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-linestrong transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-soft">{hint}</span>}
      </span>
    </label>
  );
}
