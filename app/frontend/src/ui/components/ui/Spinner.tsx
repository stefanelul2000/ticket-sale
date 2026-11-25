import clsx from 'clsx';

export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dim = size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-9 w-9 border-[3px]' : 'h-6 w-6 border-2';
  return (
    <span
      role="status"
      aria-label="loading"
      className={clsx('inline-block animate-spin rounded-full border-linestrong border-t-accent', dim, className)}
    />
  );
}
