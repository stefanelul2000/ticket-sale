import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useRoleId } from '../hooks/useRoleId';
import { useAuth } from '../../state/useAuth';

type Role = { id: number; name: string };
type User = {
  id: number;
  name: string;
  email: string | null;
  username: string;
  role_id: number;
  active?: boolean;
};

export function AdminUsersPage() {
  const { user } = useAuth();
  const roleId = useRoleId();
  const canAdmin = roleId >= 5 && !user?.impersonating;
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invite, setInvite] = useState({ name: '', email: '', username: '', password: '', role_id: '3' });
  const [toast, setToast] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', username: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!canAdmin) return;
    loadRoles();
    loadUsers();
  }, [canAdmin]);

  if (!canAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin · Users</h1>
          <p className="text-sm text-slate-400">Invite and manage staff accounts.</p>
        </div>
        <Card title="Restricted">
          <p className="text-sm text-slate-400">
            You need the Admin role and must not be impersonating to manage users. Stop impersonation or contact a site owner.
          </p>
        </Card>
      </div>
    );
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      username: user.username,
      password: '',
    });
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', username: '', password: '' });
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email || null,
        username: editForm.username,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      const updated = await api.updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      showToast('User updated.');
      closeEdit();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.roles();
      setRoles(res);
    } catch {
      /* ignore */
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.users();
      setUsers(res.data || res);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load users.');
    }
  };

  const handleInvite = async () => {
    if (!invite.name || !invite.username || !invite.password) {
      showToast('Name, username, and password are required.');
      return;
    }
    try {
      await api.createUser({ ...invite, role_id: Number(invite.role_id) });
      setInvite({ name: '', email: '', username: '', password: '', role_id: invite.role_id });
      await loadUsers();
      showToast('User invited.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to invite user.');
    }
  };

  const updateRole = async (user: User, roleId: number) => {
    try {
      await api.updateUserRole(user.id, roleId);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role_id: roleId } : u)));
      showToast('Role updated.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update role.');
    }
  };

  const updateStatus = async (user: User, active: boolean) => {
    try {
      await api.updateUserStatus(user.id, active);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active } : u)));
      showToast('Status updated.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update status.');
    }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`Delete user ${user.name}?`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast('User deleted.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin · Users</h1>
          <p className="text-sm text-slate-400">Invite and manage staff accounts.</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">{toast}</div>
        )}
      </div>

      <Card title="Invite user" actions={<Button onClick={handleInvite}>Invite</Button>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full name" value={invite.name} onChange={(e) => setInvite((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="Email (optional)" value={invite.email} onChange={(e) => setInvite((prev) => ({ ...prev, email: e.target.value }))} />
          <Input label="Username" value={invite.username} onChange={(e) => setInvite((prev) => ({ ...prev, username: e.target.value }))} />
          <Input
            label="Temporary password"
            type="password"
            value={invite.password}
            onChange={(e) => setInvite((prev) => ({ ...prev, password: e.target.value }))}
          />
          <div>
            <label className="text-sm text-slate-400">Role</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"
              value={invite.role_id}
              onChange={(e) => setInvite((prev) => ({ ...prev, role_id: e.target.value }))}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Users">
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2 text-center">Active</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-900 last:border-none">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email || 'No email'}</div>
                      <div className="text-xs text-slate-500">@{user.username}</div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white"
                        value={user.role_id}
                        onChange={(e) => updateRole(user, Number(e.target.value))}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'
                        }`}
                        onClick={() => updateStatus(user, !user.active)}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-3 space-y-2">
                      <Button variant="ghost" className="w-full text-xs" onClick={() => startEdit(user)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="w-full text-xs" onClick={() => deleteUser(user)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="mt-4 text-sm text-slate-500">No users found.</p>}
          </div>
        </div>
        <div className="space-y-3 md:hidden">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-base font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email || 'No email'}</div>
                  <div className="text-xs text-slate-500">@{user.username}</div>
                </div>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => updateStatus(user, !user.active)}
                >
                  {user.active ? 'Active' : 'Inactive'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
                  value={user.role_id}
                  onChange={(e) => updateRole(user, Number(e.target.value))}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="ghost" className="text-xs" onClick={() => startEdit(user)}>
                  Edit
                </Button>
                <Button variant="danger" className="text-xs" onClick={() => deleteUser(user)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <EditModal
        open={Boolean(editingUser)}
        onClose={closeEdit}
        form={editForm}
        onChange={(key, value) => setEditForm((prev) => ({ ...prev, [key]: value }))}
        onSave={handleEditSave}
        saving={savingEdit}
      />
    </div>
  );
}

function EditModal({
  open,
  onClose,
  form,
  onChange,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  form: { name: string; email: string; username: string; password: string };
  onChange: (key: keyof typeof form, value: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit user</h2>
          <button type="button" className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close edit dialog">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <Input label="Full name" value={form.name} onChange={(e) => onChange('name', e.target.value)} />
          <Input label="Email" value={form.email} onChange={(e) => onChange('email', e.target.value)} />
          <Input label="Username" value={form.username} onChange={(e) => onChange('username', e.target.value)} />
          <Input
            label="New password (optional)"
            type="password"
            value={form.password}
            onChange={(e) => onChange('password', e.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
