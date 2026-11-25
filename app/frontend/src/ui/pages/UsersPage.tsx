import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useT } from '../../i18n';
import { api, errorMessage } from '../../lib/api';
import { ROLE_IDS, roleDescKey, roleKey } from '../../lib/constants';
import { fmtDateTime } from '../../lib/format';
import { useAuth, useRealRoleId } from '../../state/useAuth';
import { toast } from '../../state/useToast';
import type { UserT } from '../../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Loading, PageHeader } from '../components/ui/Misc';
import { IconPlus } from '../components/Icons';

export function UsersPage() {
  const t = useT();
  const me = useAuth((s) => s.user);
  const realRole = useRealRoleId();
  const [users, setUsers] = useState<UserT[] | null>(null);
  const [editing, setEditing] = useState<Partial<UserT> | null>(null);
  const [viewAs, setViewAs] = useState('2');

  const load = useCallback(async () => {
    try {
      const res = await api.users();
      setUsers(res.data ?? res);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
      setUsers([]);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = (u: UserT) => realRole >= 6 || u.role_id < realRole;
  const assignable = ROLE_IDS.filter((r) => realRole >= 6 || r < realRole);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok, 'ok');
      load();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  const startViewAs = async () => {
    try {
      await api.impersonate(Number(viewAs));
      await useAuth.getState().refresh();
      window.location.assign('/');
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  return (
    <div>
      <PageHeader
        title={t('nav.users')}
        subtitle={t('users.subtitle')}
        actions={
          <Button onClick={() => setEditing({ role_id: 2, active: true })}>
            <IconPlus size={18} /> {t('users.add')}
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card bodyClassName="p-0" className="xl:col-span-2">
          {users === null ? (
            <Loading />
          ) : (
            <ul className="divide-y divide-line">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-sm text-soft">@{u.username}</span>
                      {!u.active && <Badge tone="warn">{t('users.inactive')}</Badge>}
                      {u.id === me?.id && <Badge tone="accent">{t('users.you')}</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-soft">
                      {t(roleKey(u.role_id))} · {u.last_login_at ? t('users.lastLogin', { when: fmtDateTime(u.last_login_at) }) : t('users.neverLoggedIn')}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {u.id !== me?.id && canManage(u) && (
                      <>
                        <select
                          aria-label={t('field.role')}
                          className="select h-8 rounded border border-linestrong bg-surface px-2 text-xs font-semibold"
                          value={u.role_id}
                          onChange={(e) => act(() => api.updateUserRole(u.id, Number(e.target.value)), t('common.saved'))}
                        >
                          {assignable.map((r) => (
                            <option key={r} value={r}>
                              {t(roleKey(r))}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant={u.active ? 'secondary' : 'success'} onClick={() => act(() => api.updateUserStatus(u.id, !u.active), t('common.saved'))}>
                          {u.active ? t('users.deactivate') : t('users.activate')}
                        </Button>
                      </>
                    )}
                    {(u.id === me?.id || canManage(u)) && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                        {t('common.edit')}
                      </Button>
                    )}
                    {u.id !== me?.id && canManage(u) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => window.confirm(t('users.deleteConfirm', { name: u.name })) && act(() => api.deleteUser(u.id), t('common.deleted'))}
                      >
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          <Card title={t('users.rolesTitle')}>
            <dl className="space-y-3 text-sm">
              {ROLE_IDS.map((r) => (
                <div key={r}>
                  <dt className="font-semibold">{t(roleKey(r))}</dt>
                  <dd className="text-soft">{t(roleDescKey(r))}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title={t('imp.title')}>
            <p className="text-sm text-soft">{t('imp.hint')}</p>
            <div className="mt-3 flex gap-2">
              <Select wrapperClassName="flex-1" value={viewAs} onChange={(e) => setViewAs(e.target.value)} aria-label={t('field.role')}>
                {ROLE_IDS.filter((r) => r < realRole).map((r) => (
                  <option key={r} value={r}>
                    {t(roleKey(r))}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={startViewAs}>{t('imp.start')}</Button>
            </div>
          </Card>
        </div>
      </div>
      {editing && <UserModal user={editing} assignable={[...assignable]} isSelf={editing.id === me?.id} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function UserModal({ user, assignable, isSelf, onClose, onSaved }: { user: Partial<UserT>; assignable: number[]; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const isNew = !user.id;
  const [form, setForm] = useState({ name: user.name ?? '', username: user.username ?? '', email: user.email ?? '', password: '', role_id: String(user.role_id ?? 2) });
  const [saving, setSaving] = useState(false);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await api.createUser({ name: form.name, username: form.username, email: form.email || null, password: form.password, role_id: Number(form.role_id) });
      } else {
        await api.updateUser(user.id!, { name: form.name, username: form.username, email: form.email || null, ...(form.password ? { password: form.password } : {}) });
      }
      toast(t('common.saved'), 'ok');
      onSaved();
      onClose();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={isNew ? t('users.add') : isSelf ? t('users.editSelf') : t('users.edit')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save()} loading={saving}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <Input label={t('field.name')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t('field.username')} required autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <Input label={t('field.emailOptional')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input
          label={isNew ? t('field.password') : t('field.newPassword')}
          type="password"
          autoComplete="new-password"
          required={isNew}
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          hint={t('users.passwordHint')}
        />
        {isNew && (
          <Select label={t('field.role')} value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            {assignable.map((r) => (
              <option key={r} value={r}>
                {t(roleKey(r))}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Modal>
  );
}
