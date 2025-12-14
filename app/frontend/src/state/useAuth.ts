import { create } from 'zustand';
import { api } from '../lib/api';

type User = {
  id: number;
  name: string;
  username: string;
  role_id: number;
  original_role_id?: number;
  impersonating?: boolean;
  role?: { id: number; name: string };
  original_role?: { id: number; name: string };
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  login: async (username, password, remember = false) => {
    set({ loading: true, error: null });
    try {
      await api.login({ username, password, remember });
      await api.me().then((user) => set({ user }));
      // mark that we have an authenticated browser session; avoid noisy /me calls otherwise
      if (remember) {
        localStorage.setItem('ts_remember', '1');
      } else {
        localStorage.removeItem('ts_remember');
      }
      sessionStorage.setItem('ts_logged_in', '1');
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Login failed' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    await api.logout();
    localStorage.removeItem('ts_remember');
    sessionStorage.removeItem('ts_logged_in');
    set({ user: null, loading: false, error: null });
  },
  fetchMe: async () => {
    const cookie = typeof document !== 'undefined' ? document.cookie || '' : '';
    const hasSessionCookie = cookie.includes('laravel_session') || cookie.includes('remember_web');
    const hasAuthFlag =
      (typeof localStorage !== 'undefined' && localStorage.getItem('ts_remember')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('ts_logged_in'));
    if (!hasSessionCookie && !hasAuthFlag) {
      set({ user: null, loading: false, error: null });
      return;
    }
    set({ loading: true });
    try {
      const user = await api.me();
      set({ user, error: null });
    } catch (err: any) {
      // Suppress auth errors on initial load; only set error on explicit login attempts.
      localStorage.removeItem('ts_remember');
      sessionStorage.removeItem('ts_logged_in');
      set({ user: null, error: null });
    } finally {
      set({ loading: false });
    }
  },
  stopImpersonation: async () => {
    await api.stopImpersonate();
    const user = await api.me();
    set({ user });
  },
}));
