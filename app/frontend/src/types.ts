export type TicketTypeT = {
  id: number;
  event_id: number;
  name: string;
  kind: string;
  capacity?: number | null;
  is_active?: boolean;
  sort?: number;
};

export type TemplateElementType = 'qr' | 'barcode' | 'number' | 'name' | 'code';

export type TemplateElement = {
  id: string;
  type: TemplateElementType;
  /** Position and size relative to the design (0..1). */
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string | null;
  background?: 'none' | 'white' | null;
  align?: 'left' | 'center' | 'right' | null;
  font?: 'sans' | 'display' | 'mono' | null;
  bold?: boolean | null;
  uppercase?: boolean | null;
  prefix?: string | null;
  digits?: number | null;
  qr_content?: 'ticket' | 'photos' | 'event' | null;
  show_text?: boolean | null;
};

export type PrintTemplate = {
  image_url: string;
  width_px: number;
  height_px: number;
  width_mm: number;
  elements: TemplateElement[];
};

export type EventT = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string | null;
  city?: string | null;
  capacity?: number | null;
  is_public?: boolean;
  donation_url?: string | null;
  photos_url?: string | null;
  print_template?: PrintTemplate | null;
  requests_enabled?: boolean;
  eticket_from?: number | null;
  eticket_to?: number | null;
  request_max?: number | null;
  eticket_message?: string | null;
  requests_pending?: number;
  tickets_eticket?: number;
  request_link?: string;
  etickets_open?: number;
  ticket_types_count?: number;
  tickets_generated?: number;
  tickets_sold?: number;
  tickets_checked_in?: number;
  tickets_walk_in?: number;
  ticket_types?: TicketTypeT[];
  public_link?: string;
};

export type TicketInfo = {
  id: number;
  ticket_code: string;
  ticket_number: number;
  name?: string | null;
  guest_category?: string | null;
  email?: string | null;
  emailed_at?: string | null;
  sold: boolean;
  sold_at?: string | null;
  checkin: boolean;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  is_walk_in?: boolean;
  is_eticket?: boolean;
  event?: { id: number; name: string } | null;
  ticket_type?: { id: number; name: string; kind?: string } | null;
};

/** Row from GET /tickets (Eloquent shape). */
export type TicketRow = {
  id: number;
  event_id: number;
  ticket_number: number;
  ticket_code: string;
  name?: string | null;
  guest_category?: string | null;
  email?: string | null;
  emailed_at?: string | null;
  sold_at?: string | null;
  checkin: boolean;
  checked_in_at?: string | null;
  is_walk_in?: boolean;
  request_id?: number | null;
  seller?: { id: number; name: string } | null;
  checked_in_by?: { id: number; name: string } | null;
  ticket_type?: { id: number; name: string } | null;
  event?: { id: number; name: string } | null;
};

export type ActivityItem = {
  id: number;
  event_id?: number | null;
  ticket_code?: string | null;
  action: 'verify' | 'checkin' | 'sell' | 'refund' | 'email';
  status: string;
  success: boolean;
  name?: string | null;
  created_at: string;
  user?: { id: number; name: string; username: string } | null;
};

export type EventReport = {
  event: { id: number; name: string; starts_at?: string | null; capacity?: number | null; venue?: string | null };
  totals: {
    capacity: number | null;
    generated: number;
    assigned: number;
    checked_in: number;
    walk_ins: number;
    not_arrived: number;
    attendance_rate: number | null;
    fill_rate: number | null;
    named: number;
  };
  by_type: { name: string | null; generated: number; assigned: number; checked_in: number }[];
  by_category: { category: string; assigned: number; checked_in: number }[];
  by_volunteer: { name: string; assigned: number; checked_in: number }[];
  arrivals: { slot: string; count: number }[];
  distribution: { day: string; count: number }[];
};

export type UserT = {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  role_id: number;
  active: boolean;
  last_login_at?: string | null;
  created_at?: string;
};

export type TicketRequestT = {
  id: number;
  event_id: number;
  email: string;
  phone?: string | null;
  /** Guests with their category (older requests may hold plain names). */
  attendees: (string | { name: string; guest_category?: string | null })[];
  quantity: number;
  message?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  locale: string;
  decided_at?: string | null;
  decision_note?: string | null;
  sent_at?: string | null;
  send_count: number;
  send_error?: string | null;
  created_at: string;
  decider?: { id: number; name: string } | null;
  tickets?: { id: number; ticket_code: string; ticket_number: number; name?: string | null; checkin: boolean }[];
};
