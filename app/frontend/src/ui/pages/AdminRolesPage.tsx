import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../components/ui/Card';
import { useRoleId } from '../hooks/useRoleId';
import { useAuth } from '../../state/useAuth';

type Permission = { id: number; key: string; name: string };
type RoleWithPerms = {
  id: number;
  name: string;
  permissions: { id: number; key: string; name: string }[];
};

export function AdminRolesPage() {
  const { user } = useAuth();
  const roleId = useRoleId();
  const canAdmin = roleId >= 5 && !user?.impersonating;
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!canAdmin) return;
    loadRoles();
    loadPermissions();
  }, [canAdmin]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const loadRoles = async () => {
    try {
      const res = await api.rolesWithPermissions();
      setRoles(res);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load roles.');
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.permissions();
      setPermissions(res);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load permissions.');
    }
  };

  const togglePermission = async (role: RoleWithPerms, perm: Permission) => {
    const has = role.permissions.some((p) => p.id === perm.id);
    const nextIds = has ? role.permissions.filter((p) => p.id !== perm.id).map((p) => p.id) : [...role.permissions.map((p) => p.id), perm.id];
    try {
      const updated = await api.updateRolePermissions(role.id, nextIds);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
      showToast('Permissions updated.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update permissions.');
    }
  };

  const managePerms = permissions.filter((perm) => perm.key.startsWith('manage.'));
  const viewPerms = permissions.filter((perm) => perm.key.startsWith('view.'));

  if (!canAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin · Roles</h1>
          <p className="text-sm text-slate-400">Assign permissions to each role.</p>
        </div>
        <Card title="Restricted">
          <p className="text-sm text-slate-400">
            You need the Admin role (and must not be impersonating) to edit role permissions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin · Roles</h1>
          <p className="text-sm text-slate-400">Assign permissions to each role.</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">{toast}</div>
        )}
      </div>

      <Card title="Role permissions">
        <div className="space-y-6">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 text-lg font-semibold text-white">{role.name}</div>
              <div className="grid gap-4 md:grid-cols-2">
                <PermissionGroup title="Manage" role={role} permissions={managePerms} onToggle={togglePermission} />
                <PermissionGroup title="View" role={role} permissions={viewPerms} onToggle={togglePermission} />
              </div>
            </div>
          ))}
          {roles.length === 0 && <p className="text-sm text-slate-500">No roles available.</p>}
        </div>
      </Card>
    </div>
  );
}

type PermissionGroupProps = {
  title: string;
  role: RoleWithPerms;
  permissions: Permission[];
  onToggle: (role: RoleWithPerms, perm: Permission) => void;
};

function PermissionGroup({ title, role, permissions, onToggle }: PermissionGroupProps) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">
        {permissions.map((perm) => {
          const has = role.permissions.some((p) => p.id === perm.id);
          return (
            <button
              key={perm.id}
              type="button"
              onClick={() => onToggle(role, perm)}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition ${
                has ? 'border-blue-500 bg-blue-500/20 text-blue-100' : 'border-slate-700 bg-slate-900/40 text-slate-300'
              }`}
            >
              {perm.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
