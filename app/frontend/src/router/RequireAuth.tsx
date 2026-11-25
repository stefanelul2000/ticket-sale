import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useRoleId } from '../state/useAuth';
import { Loading } from '../ui/components/ui/Misc';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checked, fetchMe } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!checked) fetchMe();
  }, [checked, fetchMe]);

  if (!checked) return <div className="min-h-screen bg-bg"><Loading /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

/** Hide pages from roles that cannot use them (the API enforces it too). */
export function RequireRole({ allow, children }: { allow: (role: number) => boolean; children: ReactNode }) {
  const role = useRoleId();
  if (!allow(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
