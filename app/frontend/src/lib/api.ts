import axios from 'axios';

// Load API URL from runtime config injected by config.js
const runtimeApiUrl = window.__APP_CONFIG__?.API_URL;

// Fallback to the detected host if the config is missing
const fallbackHost = `${window.location.origin}/api`;

// Axios instance
export const client = axios.create({
  baseURL: runtimeApiUrl || fallbackHost,
  withCredentials: true,
});


export type AuthResponse = {
  token?: string;
};

export const api = {
  login: (data: { username: string; password: string; remember?: boolean }) =>
    client.post('/login', data).then((r) => r.data),
  register: (data: { name: string; email?: string; username: string; password: string; password_confirmation: string }) =>
    client.post('/register', data).then((r) => r.data),
  logout: () => client.post('/logout'),
  me: () => client.get('/me').then((r) => r.data),
  setupStatus: () => client.get('/setup/status').then((r) => r.data),
  setup: (payload: any) => client.post('/setup', payload).then((r) => r.data),
  setupTestDb: (payload: any) => client.post('/setup/test-db', payload).then((r) => r.data),
  uploadLogo: (formData: FormData) =>
    client.post('/setup/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  branding: () => client.get('/branding').then((r) => r.data),
  saveBranding: (payload: any) => client.post('/branding', payload).then((r) => r.data),
  tickets: (params?: Record<string, any>) => client.get('/tickets', { params }).then((r) => r.data),
  verify: (ticketNumber: string) => client.get(`/tickets/${ticketNumber}/verify`).then((r) => r.data),
  checkin: (ticketNumber: string) => client.post(`/tickets/${ticketNumber}/checkin`),
  sell: (ticketNumber: string, payload: any) => client.post(`/tickets/${ticketNumber}/sell`, payload),
  refund: (ticketNumber: string) => client.post(`/tickets/${ticketNumber}/refund`),
  generate: (payload: { event_id?: number; ticket_type_id: number; count: number }) =>
    client.post('/tickets/generate', payload).then((r) => r.data),
  eventTickets: (eventId: number, ticket_type_id?: number) =>
    client
      .get(`/events/${eventId}/tickets`, { params: ticket_type_id ? { ticket_type_id } : undefined })
      .then((r) => r.data),
  stats: () => client.get('/stats').then((r) => r.data),
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
