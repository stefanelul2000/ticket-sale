import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Runtime config (public/config.js, written at container start). Empty => same origin.
const configured = window.__APP_CONFIG__?.API_URL?.trim();
const runtimeApiUrl = configured && !configured.startsWith('__') ? configured.replace(/\/+$/, '') : '';
const baseURL = runtimeApiUrl || `${window.location.origin}/api`;
const appOrigin = new URL(baseURL, window.location.origin).origin;

export const client = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

/** Sanctum: obtain the XSRF-TOKEN cookie before state-changing auth calls. */
export const ensureCsrfCookie = () =>
  axios.get(`${appOrigin}/sanctum/csrf-cookie`, { withCredentials: true }).catch(() => undefined);

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // CSRF token expired (e.g. long idle at the door): refresh once and retry.
    if (status === 419 && config && !config._csrfRetried) {
      config._csrfRetried = true;
      await ensureCsrfCookie();
      return client.request(config);
    }

    // Session expired: send the user back to the login screen (except for the silent /me probe).
    if (status === 401 && config?.url && !config.url.endsWith('/me') && !config.url.endsWith('/login')) {
      sessionStorage.removeItem('ts_logged_in');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export type AuthResponse = {
  token?: string;
};

const code = (value: string) => encodeURIComponent(value);

export const api = {
  login: async (data: { username: string; password: string; remember?: boolean }) => {
    await ensureCsrfCookie();
    return client.post('/login', data).then((r) => r.data);
  },
  register: async (data: { name: string; email?: string; username: string; password: string; password_confirmation: string }) => {
    await ensureCsrfCookie();
    return client.post('/register', data).then((r) => r.data);
  },
  logout: () => client.post('/logout'),
  me: () => client.get('/me').then((r) => r.data),
  setupStatus: () => client.get('/setup/status').then((r) => r.data),
  setup: async (payload: any) => {
    await ensureCsrfCookie();
    return client.post('/setup', payload).then((r) => r.data);
  },
  setupTestDb: (payload: any) => client.post('/setup/test-db', payload).then((r) => r.data),
  uploadLogo: (formData: FormData) => client.post('/setup/logo', formData).then((r) => r.data),
  branding: () => client.get('/branding').then((r) => r.data),
  saveBranding: (payload: any) => client.post('/branding', payload).then((r) => r.data),
  tickets: (params?: Record<string, any>) => client.get('/tickets', { params }).then((r) => r.data),
  verify: (ticketCode: string) => client.get(`/tickets/${code(ticketCode)}/verify`).then((r) => r.data),
  checkin: (ticketCode: string) => client.post(`/tickets/${code(ticketCode)}/checkin`).then((r) => r.data),
  sell: (ticketCode: string, payload: { name: string }) =>
    client.post(`/tickets/${code(ticketCode)}/sell`, payload).then((r) => r.data),
  refund: (ticketCode: string) => client.post(`/tickets/${code(ticketCode)}/refund`).then((r) => r.data),
  generate: (payload: { event_id?: number; ticket_type_id: number; count: number }) =>
    client.post('/tickets/generate', payload).then((r) => r.data),
  eventTickets: (eventId: number, ticket_type_id?: number) =>
    client
      .get(`/events/${eventId}/tickets`, { params: ticket_type_id ? { ticket_type_id } : undefined })
      .then((r) => r.data),
  stats: (event_id?: number) => client.get('/stats', { params: event_id ? { event_id } : undefined }).then((r) => r.data),
  roles: () => client.get('/roles').then((r) => r.data),
  rolesWithPermissions: () => client.get('/roles/with-permissions').then((r) => r.data),
  permissions: () => client.get('/permissions').then((r) => r.data),
  updateRolePermissions: (roleId: number, permission_ids: number[]) =>
    client.post(`/roles/${roleId}/permissions`, { permission_ids }).then((r) => r.data),
  users: () => client.get('/users').then((r) => r.data),
  createUser: (payload: any) => client.post('/users', payload),
  updateUser: (id: number, payload: any) => client.patch(`/users/${id}`, payload).then((r) => r.data),
  updateUserRole: (id: number, role_id: number) => client.patch(`/users/${id}/role`, { role_id }),
  updateUserStatus: (id: number, active: boolean) => client.patch(`/users/${id}/status`, { active }).then((r) => r.data),
  deleteUser: (id: number) => client.delete(`/users/${id}`).then((r) => r.data),
  events: () => client.get('/events').then((r) => r.data),
  eventSummaries: () => client.get('/events/summary').then((r) => r.data),
  createEvent: (payload: any) => client.post('/events', payload).then((r) => r.data),
  updateEvent: (id: number, payload: any) => client.patch(`/events/${id}`, payload).then((r) => r.data),
  deleteEvent: (id: number) => client.delete(`/events/${id}`).then((r) => r.data),
  ticketTypes: (event_id?: number) =>
    client.get('/ticket-types', { params: event_id ? { event_id } : undefined }).then((r) => r.data),
  createTicketType: (payload: any) => client.post('/ticket-types', payload).then((r) => r.data),
  updateTicketType: (id: number, payload: any) => client.patch(`/ticket-types/${id}`, payload).then((r) => r.data),
  deleteTicketType: (id: number) => client.delete(`/ticket-types/${id}`).then((r) => r.data),
  ticketActivity: (limit?: number) =>
    client.get('/ticket-activity', { params: limit ? { limit } : undefined }).then((r) => r.data),
  clearTicketActivity: () => client.delete('/ticket-activity').then((r) => r.data),
  impersonate: (role_id: number) => client.post('/impersonate', { role_id }).then((r) => r.data),
  stopImpersonate: () => client.delete('/impersonate').then((r) => r.data),
};
