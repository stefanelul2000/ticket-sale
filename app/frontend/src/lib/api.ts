import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useI18n } from '../i18n';

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

client.interceptors.request.use((config) => {
  config.headers.set('X-Locale', useI18n.getState().lang);
  return config;
});

/** Sanctum: obtain the XSRF-TOKEN cookie before state-changing auth calls. */
export const ensureCsrfCookie = () =>
  axios.get(`${appOrigin}/sanctum/csrf-cookie`, { withCredentials: true }).catch(() => undefined);

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

const PUBLIC_PATHS = /^\/(e|t|login|setup)(\/|$)/;

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // CSRF token expired (long idle at the door): refresh once and retry.
    if (status === 419 && config && !config._csrfRetried) {
      config._csrfRetried = true;
      await ensureCsrfCookie();
      return client.request(config);
    }

    // Session expired on a staff page: back to login (public pages never redirect).
    if (status === 401 && config?.url && !config.url.endsWith('/me') && !config.url.endsWith('/login')) {
      sessionStorage.removeItem('ts_logged_in');
      if (!PUBLIC_PATHS.test(window.location.pathname)) {
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }

    return Promise.reject(error);
  },
);

/** Human message from an API error (validation errors included). */
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
  const data = e?.response?.data;
  const firstValidation = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  if (firstValidation) return firstValidation;
  if (data?.message) return data.message;
  if (e?.response === undefined && e?.request) return useI18n.getState().lang === 'ro' ? 'Fără conexiune la server.' : 'No connection to the server.';
  return fallback;
}

const code = (value: string) => encodeURIComponent(value);

export type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number; per_page: number };

export const api = {
  // auth
  login: async (data: { username: string; password: string; remember?: boolean }) => {
    await ensureCsrfCookie();
    return client.post('/login', data).then((r) => r.data);
  },
  logout: () => client.post('/logout'),
  me: () => client.get('/me').then((r) => r.data),

  // setup
  setupStatus: () => client.get('/setup/status').then((r) => r.data),
  setup: async (payload: Record<string, unknown>) => {
    await ensureCsrfCookie();
    return client.post('/setup', payload).then((r) => r.data);
  },
  setupTestDb: (payload: Record<string, unknown>) => client.post('/setup/test-db', payload).then((r) => r.data),

  // public
  publicSettings: () => client.get('/public/settings').then((r) => r.data),
  publicEvents: () => client.get('/public/events').then((r) => r.data),
  publicEvent: (slug: string) => client.get(`/public/events/${encodeURIComponent(slug)}`).then((r) => r.data),
  publicTicket: (ticketCode: string) => client.get(`/public/tickets/${code(ticketCode)}`).then((r) => r.data),
  publicRequest: (slug: string, payload: Record<string, unknown>) =>
    client.post(`/public/events/${encodeURIComponent(slug)}/requests`, payload).then((r) => r.data),

  // e-ticket requests (staff)
  eventRequests: (eventId: number, status = 'pending') => client.get(`/events/${eventId}/requests`, { params: { status } }).then((r) => r.data),
  approveRequest: (id: number, payload: { attendees: string[]; guest_category?: string | null }) =>
    client.post(`/requests/${id}/approve`, payload).then((r) => r.data),
  sendRequest: (id: number, designs: Blob[] = []) => {
    const form = new FormData();
    designs.forEach((b, i) => form.append('designs[]', b, `e-bilet-${i + 1}.${b.type === 'image/png' ? 'png' : 'jpg'}`));
    return client.post(`/requests/${id}/send`, form).then((r) => r.data);
  },
  rejectRequest: (id: number, payload: { note?: string | null; notify: boolean }) => client.post(`/requests/${id}/reject`, payload).then((r) => r.data),
  cancelRequest: (id: number) => client.post(`/requests/${id}/cancel`).then((r) => r.data),
  mailStatus: () => client.get('/settings/mail').then((r) => r.data),
  testMail: (to: string) => client.post('/settings/mail/test', { to }).then((r) => r.data),

  // settings
  settings: () => client.get('/settings').then((r) => r.data),
  saveSettings: (payload: Record<string, unknown>) => client.put('/settings', payload).then((r) => r.data),

  // events
  events: () => client.get('/events').then((r) => r.data),
  event: (id: number) => client.get(`/events/${id}`).then((r) => r.data),
  eventSummaries: () => client.get('/events/summary').then((r) => r.data),
  createEvent: (payload: Record<string, unknown>) => client.post('/events', payload).then((r) => r.data),
  updateEvent: (id: number, payload: Record<string, unknown>) => client.patch(`/events/${id}`, payload).then((r) => r.data),
  deleteEvent: (id: number) => client.delete(`/events/${id}`).then((r) => r.data),
  duplicateEvent: (id: number) => client.post(`/events/${id}/duplicate`).then((r) => r.data),
  eventTickets: (eventId: number, ticket_type_id?: number) =>
    client.get(`/events/${eventId}/tickets`, { params: ticket_type_id ? { ticket_type_id } : undefined }).then((r) => r.data),
  assignList: (eventId: number, payload: { ticket_type_id: number; generate_missing: boolean; entries: { name: string; guest_category?: string | null }[] }) =>
    client.post(`/events/${eventId}/assign-list`, payload).then((r) => r.data),
  uploadTemplate: (eventId: number, image: Blob, filename: string) => {
    const form = new FormData();
    form.append('image', image, filename);
    return client.post(`/events/${eventId}/template`, form).then((r) => r.data);
  },
  saveTemplate: (eventId: number, payload: { width_mm: number; elements: unknown[] }) =>
    client.put(`/events/${eventId}/template`, payload).then((r) => r.data),
  deleteTemplate: (eventId: number) => client.delete(`/events/${eventId}/template`).then((r) => r.data),
  walkIn: (eventId: number, payload: { name?: string; guest_category?: string | null }) =>
    client.post(`/events/${eventId}/walk-in`, payload).then((r) => r.data),

  // ticket types
  ticketTypes: (event_id?: number) => client.get('/ticket-types', { params: event_id ? { event_id } : undefined }).then((r) => r.data),
  createTicketType: (payload: Record<string, unknown>) => client.post('/ticket-types', payload).then((r) => r.data),
  updateTicketType: (id: number, payload: Record<string, unknown>) => client.patch(`/ticket-types/${id}`, payload).then((r) => r.data),
  deleteTicketType: (id: number) => client.delete(`/ticket-types/${id}`).then((r) => r.data),

  // tickets
  tickets: (params?: Record<string, unknown>) => client.get('/tickets', { params }).then((r) => r.data),
  generate: (payload: { event_id?: number; ticket_type_id: number; count: number }) => client.post('/tickets/generate', payload).then((r) => r.data),
  verify: (ticketCode: string, event_id?: number | null) =>
    client.get(`/tickets/${code(ticketCode)}/verify`, { params: event_id ? { event_id } : undefined }).then((r) => r.data),
  checkin: (ticketCode: string, event_id?: number | null) =>
    client.post(`/tickets/${code(ticketCode)}/checkin`, event_id ? { event_id } : {}).then((r) => r.data),
  sell: (ticketCode: string, payload: { name: string; guest_category?: string | null; event_id?: number | null }) =>
    client.post(`/tickets/${code(ticketCode)}/sell`, payload).then((r) => r.data),
  updateTicket: (ticketCode: string, payload: { name?: string; guest_category?: string | null }) =>
    client.patch(`/tickets/${code(ticketCode)}`, payload).then((r) => r.data),
  refund: (ticketCode: string) => client.post(`/tickets/${code(ticketCode)}/refund`).then((r) => r.data),
  stats: (event_id?: number | null) => client.get('/stats', { params: event_id ? { event_id } : undefined }).then((r) => r.data),
  ticketActivity: (params?: { limit?: number; event_id?: number | null }) =>
    client.get('/ticket-activity', { params: { limit: params?.limit, event_id: params?.event_id || undefined } }).then((r) => r.data),
  clearTicketActivity: () => client.delete('/ticket-activity').then((r) => r.data),

  // reports
  reportOverview: () => client.get('/reports/overview').then((r) => r.data),
  reportEvent: (eventId: number) => client.get(`/reports/events/${eventId}`).then((r) => r.data),
  repeatGuests: () => client.get('/reports/repeat-guests').then((r) => r.data),

  // users
  roles: () => client.get('/roles').then((r) => r.data),
  users: () => client.get('/users', { params: { per_page: 200 } }).then((r) => r.data),
  createUser: (payload: Record<string, unknown>) => client.post('/users', payload).then((r) => r.data),
  updateUser: (id: number, payload: Record<string, unknown>) => client.patch(`/users/${id}`, payload).then((r) => r.data),
  updateUserRole: (id: number, role_id: number) => client.patch(`/users/${id}/role`, { role_id }).then((r) => r.data),
  updateUserStatus: (id: number, active: boolean) => client.patch(`/users/${id}/status`, { active }).then((r) => r.data),
  deleteUser: (id: number) => client.delete(`/users/${id}`).then((r) => r.data),
  impersonate: (role_id: number) => client.post('/impersonate', { role_id }).then((r) => r.data),
  stopImpersonate: () => client.delete('/impersonate').then((r) => r.data),
};
