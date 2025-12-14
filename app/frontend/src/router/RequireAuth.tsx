import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/useAuth';
import { Spinner } from '../ui/components/ui/Spinner';

type Props = {
  children: ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { user, fetchMe, loading } = useAuth();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user && !checked) {
      fetchMe()
        .catch(() => {})
        .finally(() => setChecked(true));
    } else if (user && !checked) {
      setChecked(true);
    }
  }, [user, fetchMe, checked]);

  if (!checked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
