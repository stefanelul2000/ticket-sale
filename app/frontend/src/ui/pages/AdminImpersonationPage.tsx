import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../../lib/api';
import { useAuth } from '../../state/useAuth';
import { useRoleId } from '../hooks/useRoleId';

type Role = {
  id: number;
  name: string;
};

const roleDestination = (roleId: number) => {
  if (roleId >= 4) return '/events';
  if (roleId >= 2) return '/tickets';
  return '/dashboard';
};

export function AdminImpersonationPage() {
  const { user, fetchMe, stopImpersonation } = useAuth();
  const roleId = useRoleId();
  const canAdmin = roleId >= 5;
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.impersonating || !canAdmin) {
      setRoles([]);
      setLoading(false);
      return;
    }
    api
      .roles()
      .then((res) => {
        setRoles(res);
        if (res.length) {
          setSelectedRole(String(res[0].id));
        }
      })
      .catch(() => setError('Failed to load roles.'))
      .finally(() => setLoading(false));
  }, [user?.impersonating, canAdmin]);

  const startImpersonation = async () => {
    if (!selectedRole) return;
    setActing(true);
    setError(null);
    try {
      await api.impersonate(Number(selectedRole));
      await fetchMe();
      const nextRole = useAuth.getState().user?.role_id ?? 1;
      navigate(roleDestination(nextRole), { replace: true });
      setMessage('You are now impersonating this role.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to impersonate.');
    } finally {
      setActing(false);
    }
  };

  const stopImpersonationAction = async () => {
    setActing(true);
    setError(null);
    try {
      await stopImpersonation();
      const nextRole = useAuth.getState().user?.role_id ?? 1;
      navigate(roleDestination(nextRole), { replace: true });
      setMessage('Impersonation ended.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to stop impersonation.');
    } finally {
      setActing(false);
    }
  };

  const isImpersonating = Boolean(user?.impersonating);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Impersonation</h1>
        <p className="text-sm text-slate-400">
          Assume another role to validate permissions or troubleshoot as different staff members.
        </p>
      </div>

      <Card
        title="Choose role"
        actions={loading ? <Spinner size="sm" /> : user?.impersonating ? <span className="text-xs text-amber-300">Stop impersonation to adjust</span> : null}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="impersonate-role">
              Target role
            </label>
            <select
              id="impersonate-role"
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={loading || acting || Boolean(user?.impersonating)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
            <div className="flex items-center justify-between">
              <span>Current role</span>
              <span className="font-semibold text-white">{user?.role?.name ?? user?.role_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className={isImpersonating ? 'text-amber-300' : 'text-emerald-300'}>
                {isImpersonating ? 'Impersonating' : 'Normal session'}
              </span>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-green-300">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={startImpersonation} disabled={!selectedRole || acting || Boolean(user?.impersonating) || !canAdmin}>
            {acting ? 'Applying…' : 'Start impersonation'}
          </Button>
          <Button variant="ghost" onClick={stopImpersonationAction} disabled={!isImpersonating || acting}>
            Stop impersonation
          </Button>
        </div>
      </Card>
      {!canAdmin && !user?.impersonating && (
        <Card title="Restricted">
          <p className="text-sm text-slate-400">Only administrators can impersonate other roles.</p>
        </Card>
      )}
      {!canAdmin && user?.impersonating && (
        <Card title="Return to your role">
          <p className="text-sm text-slate-400">Use the button above to exit impersonation before making further changes.</p>
        </Card>
      )}
    </div>
  );
}
