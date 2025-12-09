import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useTheme } from '../../../state/useTheme';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { inputStyle, colorStyle } from '../../styles';

type RoleWithPerms = {
  id: number;
  name: string;
  permissions: { id: number; key: string; name: string }[];
};

type Permission = { id: number; key: string; name: string };
type UserModel = { id: number; name: string; email: string; username: string; role_id: number; active?: boolean; role?: { id: number; name: string } };

type Props = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  logout: () => Promise<void> | void;
  adminSection: 'branding' | 'users' | 'roles' | 'impersonate';
  setAdminSection: (section: 'branding' | 'users' | 'roles' | 'impersonate') => void;
  rolesPerms: RoleWithPerms[];
  setRolesPerms: React.Dispatch<React.SetStateAction<RoleWithPerms[]>>;
  permissions: Permission[];
  users: UserModel[];
  setUsers: React.Dispatch<React.SetStateAction<UserModel[]>>;
  fetchMe: () => Promise<void> | void;
  showToast: (msg: string) => void;
  setModal: (modal: any) => void;
  withLoading: (key: string, fn: () => Promise<void>) => Promise<void>;
  isLoading: (key: string) => boolean;
};

export function AdminView({
  header,
  sidebar,
  logout,
  adminSection,
  setAdminSection,
  rolesPerms,
  setRolesPerms,
  permissions,
  users,
  setUsers,
  fetchMe,
  showToast,
  setModal,
  withLoading,
  isLoading,
}: Props) {
  const { setTheme, logoUrl, primary, secondary, background } = useTheme();
  const [brandDraft, setBrandDraft] = useState({ primary, secondary, background });
  const [logoFileName, setLogoFileName] = useState('');
  const [invite, setInvite] = useState({ name: '', email: '', username: '', password: '', role_id: '3' });

  useEffect(() => {
    setBrandDraft({ primary, secondary, background });
  }, [primary, secondary, background]);

  const uploadLogo = async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await api.uploadLogo(formData);
      setTheme({ logoUrl: res.url });
      setLogoFileName(file.name);
      showToast('Logo uploaded.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Logo upload failed';
      showToast(msg);
    }
  };

  const getContrastText = (hex: string) => {
    if (!hex) return '#0b101a';
    const n = hex.replace('#', '');
    if (n.length !== 6) return '#0b101a';
    const r = parseInt(n.substring(0, 2), 16);
    const g = parseInt(n.substring(2, 4), 16);
    const b = parseInt(n.substring(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#0b101a' : '#f8f9ff';
  };

  const applyThemeVars = (p: string, s: string, b: string) => {
    if (p) document.documentElement.style.setProperty('--accent', p);
    if (s) document.documentElement.style.setProperty('--accent-2', s);
    if (b) document.documentElement.style.setProperty('--bg', b);
  };

  const handleDelete = async (type: string, id: number, successLabel: string) => {
    await withLoading(`delete-${type}-${id}`, async () => {
      try {
        if (type === 'user') {
          await api.deleteUser(id);
          setUsers((prev) => prev.filter((u) => u.id !== id));
        }
        showToast(successLabel);
      } catch (err: any) {
        showToast(err?.response?.data?.message || 'Delete failed.');
      }
    });
  };

  const adminTabs: { key: typeof adminSection; label: string }[] = [
    { key: 'branding', label: 'Branding' },
    { key: 'users', label: 'Users' },
    { key: 'roles', label: 'Roles' },
    { key: 'impersonate', label: 'Impersonate' },
  ];

  const renderSection = () => {
    switch (adminSection) {
      case 'branding':
        return (
          <Card title="Branding">
            <div className="branding-container">
              <div style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>Theme colors</div>
                <div className="branding-colors-grid">
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13 }}>Primary</label>
                    <input
                      type="color"
                      value={brandDraft.primary}
                      onChange={(e) => setBrandDraft((prev) => ({ ...prev, primary: e.target.value }))}
                      style={colorStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13 }}>Secondary</label>
                    <input
                      type="color"
                      value={brandDraft.secondary}
                      onChange={(e) => setBrandDraft((prev) => ({ ...prev, secondary: e.target.value }))}
                      style={colorStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <label style={{ color: 'var(--muted)', fontSize: 13 }}>Background</label>
                    <input
                      type="color"
                      value={brandDraft.background}
                      onChange={(e) => setBrandDraft((prev) => ({ ...prev, background: e.target.value }))}
                      style={colorStyle}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    applyThemeVars(brandDraft.primary, brandDraft.secondary, brandDraft.background);
                    const payload = {
                      primary: brandDraft.primary,
                      secondary: brandDraft.secondary,
                      background: brandDraft.background,
                    };
                    setTheme(payload as any);
                    api.saveBranding({ ...payload, logoUrl });
                    showToast('Branding saved.');
                  }}
                  style={{
                    width: 'fit-content',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: getContrastText(brandDraft.primary),
                    boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Save branding
                </Button>
              </div>

              <div style={{ display: 'grid', gap: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>Logo</div>
                <input
                  placeholder="Logo URL"
                  value={logoUrl}
                  onChange={(e) => setTheme({ logoUrl: e.target.value })}
                  style={inputStyle}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label
                    htmlFor="logo-upload-admin"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                      color: getContrastText(brandDraft.primary),
                      cursor: 'pointer',
                      fontWeight: 600,
                      boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Upload logo
                  </label>
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>
                    {logoFileName || 'No file chosen'}
                  </span>
                  <input
                    id="logo-upload-admin"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files && uploadLogo(e.target.files[0])}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <div style={{ color: 'var(--muted)' }}>Preview:</div>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ height: 40, width: 40, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: 8 }} />
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      case 'roles': {
        const labelMap: Record<number, string> = {
          1: 'Viewer (Reports)',
          2: 'Check-in (Verify/Stats)',
          3: 'Seller (Sell/Stats)',
          4: 'Event Manager',
          5: 'Admin (Full access)',
          6: 'Site Owner (Immutable)',
        };
        const descMap: Record<number, string> = {
          1: 'Can only view reports.',
          2: 'Can verify/check-in tickets and view stats.',
          3: 'Can sell tickets and view stats.',
          4: 'Manage events and ticket types.',
          5: 'Full access; role management and impersonation.',
          6: 'Full access; cannot be altered.',
        };
        const orderedRoles = rolesPerms.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        return (
          <Card title="Roles & Permissions">
            <div style={{ display: 'grid', gap: 12 }}>
              {orderedRoles.map((role) => {
                const isLocked = role.id === 5 || role.id === 6;
                return (
                <div key={role.id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{labelMap[role.id] || role.name}</div>
        {descMap[role.id] && (
          <div style={{ color: 'var(--muted)', marginBottom: 8, fontSize: 13 }}>{descMap[role.id]}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, color: 'var(--muted)' }}>Manage</div>
            {permissions
              .filter((p) => p.key.startsWith('manage.'))
              .map((perm) => {
                const has = role.permissions?.some((p) => p.id === perm.id);
                return (
                  <label
                    key={perm.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '6px 10px',
                      background: has ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.04)',
                      color: has ? '#0b101a' : 'var(--text)',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={has}
                      onChange={
                        isLocked
                          ? undefined
                          : async () => {
                              const next = has
                                ? role.permissions.filter((p) => p.id !== perm.id).map((p) => p.id)
                                : [...(role.permissions || []).map((p) => p.id), perm.id];
                              const updated = await api.updateRolePermissions(role.id, next);
                              setRolesPerms((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
                            }
                      }
                      style={{ display: 'none' }}
                    />
                    {perm.name}
                  </label>
                );
              })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, color: 'var(--muted)' }}>View</div>
            {permissions
              .filter((p) => p.key.startsWith('view.'))
              .map((perm) => {
                const has = role.permissions?.some((p) => p.id === perm.id);
                return (
                  <label
                    key={perm.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '6px 10px',
                      background: has ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'rgba(255,255,255,0.04)',
                      color: has ? '#0b101a' : 'var(--text)',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={has}
                      onChange={
                        isLocked
                          ? undefined
                          : async () => {
                              const next = has
                                ? role.permissions.filter((p) => p.id !== perm.id).map((p) => p.id)
                                : [...(role.permissions || []).map((p) => p.id), perm.id];
                              const updated = await api.updateRolePermissions(role.id, next);
                              setRolesPerms((prev) => prev.map((r) => (r.id === role.id ? updated : r)));
                            }
                      }
                      style={{ display: 'none' }}
                    />
                    {perm.name}
                  </label>
                );
              })}
          </div>
        </div>
                </div>
                );
              })}
            </div>
          </Card>
        );
      }
      case 'users':
        return (
          <Card title="Users">
            <div className="admin-users-invite">
              <input
                placeholder="Name"
                value={invite.name}
                onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Email (optional)"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Username"
                value={invite.username}
                onChange={(e) => setInvite({ ...invite, username: e.target.value })}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Temp password"
                value={invite.password}
                onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                style={inputStyle}
              />
              <select
                value={invite.role_id}
                onChange={(e) => setInvite({ ...invite, role_id: e.target.value })}
                style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
              >
                {rolesPerms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  onClick={async () => {
                    if (!invite.username || !invite.password || !invite.name) return;
                    await api.createUser({ ...invite, role_id: Number(invite.role_id) });
                    const usersRes = await api.users();
                    setUsers(usersRes.data || usersRes);
                    setInvite({ name: '', email: '', username: '', password: '', role_id: '3' });
                  }}
                >
                  Invite user
                </Button>
              </div>
            </div>
            <div className="admin-users-list">
              {users.map((u) => {
                const statusLoading = isLoading(`status-user-${u.id}`);
                const roleLoading = isLoading(`role-user-${u.id}`);
                const deletingUser = isLoading(`delete-user-${u.id}`);
                return (
                <div
                  key={u.id}
                  className="admin-user-row"
                >
                  <div style={{ fontWeight: 700 }}>{u.name}</div>
                  <div style={{ color: 'var(--muted)' }}>{u.email || '—'}</div>
                  <div style={{ color: 'var(--muted)' }}>@{u.username}</div>
                  <select
                    value={u.role_id}
                    disabled={roleLoading}
                    onChange={async (e) => {
                      const role_id = Number(e.target.value);
                      await withLoading(`role-user-${u.id}`, async () => {
                        await api.updateUserRole(u.id, role_id);
                        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role_id } : x)));
                        showToast(`Updated role for ${u.name}.`);
                      });
                    }}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                    >
                      {rolesPerms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        color: u.active ? '#43d9ad' : '#ff8c8c',
                        minWidth: 72,
                        textAlign: 'center',
                      }}
                    >
                      {u.active ? 'Active' : 'Pending'}
                    </span>
                    <Button
                      variant="ghost"
                      disabled={statusLoading}
                      onClick={async () => {
                        await withLoading(`status-user-${u.id}`, async () => {
                          await api.updateUserStatus(u.id, !u.active);
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
                          showToast(`${u.active ? 'Deactivated' : 'Activated'} ${u.name}.`);
                        });
                      }}
                    >
                      {statusLoading ? 'Working...' : u.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={deletingUser}
                      onClick={() =>
                        setModal({
                          title: 'Delete user',
                          message: `Delete user "${u.name}"?`,
                          confirmLabel: deletingUser ? 'Deleting...' : 'Delete',
                          onConfirm: async () => {
                            await handleDelete('user', u.id, `Deleted user "${u.name}".`);
                            setModal(null);
                          },
                        })
                      }
                    >
                      {deletingUser ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )})}
            </div>
          </Card>
        );
      case 'impersonate':
        return (
          <Card title="Impersonate a role (admin only)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <select
                style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', maxWidth: 200 }}
                onChange={async (e) => {
                  const roleId = Number(e.target.value);
                  if (!roleId) return;
                  await api.impersonate(roleId);
                  await fetchMe();
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Select role
                </option>
                {rolesPerms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={async () => {
                  await api.stopImpersonate();
                  await fetchMe();
                }}
              >
                Stop impersonating
              </Button>
            </div>
            <div style={{ color: 'var(--muted)' }}>
              This temporarily overrides your role for testing; it does not change your stored role.
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout header={header} sidebar={sidebar} onLogout={logout}>
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {adminTabs.map((tab) => (
            <Button
                key={tab.key}
                variant={adminSection === tab.key ? 'solid' : 'ghost'}
                onClick={() => setAdminSection(tab.key)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: adminSection === tab.key ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                  background:
                    adminSection === tab.key
                      ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                      : 'rgba(255,255,255,0.06)',
                  boxShadow: adminSection === tab.key ? '0 12px 30px rgba(0,0,0,0.25)' : 'none',
                  color: adminSection === tab.key ? '#0b101a' : 'var(--text)',
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        {renderSection()}
      </div>
    </Layout>
  );
}
