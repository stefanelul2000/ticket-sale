import { create } from 'zustand';
import { api } from '../lib/api';

export type User = {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  role_id: number;
  original_role_id?: number;
  impersonating?: boolean;
  role?: { id: number; name: string };
  original_role?: { id: number; name: string } | null;
};

type AuthState = {
  user: User | null;
  checked: boolean;
  loading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  refresh: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  checked: false,
  loading: false,
  login: async (username, password, remember = false) => {
    set({ loading: true });
    try {
      await api.login({ username, password, remember });
      const user = await api.me();
      set({ user, checked: true });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ user: null });
    }
  },
  // The session cookie is HttpOnly, so the only reliable check is asking the server.
  fetchMe: async () => {
    if (get().checked) return;
    set({ loading: true });
    try {
      set({ user: await api.me() });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false, checked: true });
    }
  },
  refresh: async () => {
    try {
      set({ user: await api.me() });
    } catch {
      set({ user: null });
    }
  },
  stopImpersonation: async () => {
    await api.stopImpersonate();
    set({ user: await api.me() });
  },
}));

/** Effective role (impersonated role when "viewing as"). */
export const useRoleId = () => useAuth((s) => s.user?.role_id ?? 0);
/** Real role of the signed-in person. */
export const useRealRoleId = () => useAuth((s) => s.user?.original_role_id ?? s.user?.role_id ?? 0);
