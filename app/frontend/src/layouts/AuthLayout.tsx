import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function AuthLayout({ children, title = 'Welcome', subtitle }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#1b1f46] via-[#1d1c64] to-[#05060f] px-4 py-12 text-white">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="text-base text-white/70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
