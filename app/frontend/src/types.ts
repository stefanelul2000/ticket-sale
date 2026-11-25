export type TicketTypeT = {
  id: number;
  event_id: number;
  name: string;
  kind: string;
  capacity?: number | null;
  is_active?: boolean;
  sort?: number;
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
  sold: boolean;
  sold_at?: string | null;
  checkin: boolean;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  is_walk_in?: boolean;
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
  sold_at?: string | null;
  checkin: boolean;
  checked_in_at?: string | null;
  is_walk_in?: boolean;
  seller?: { id: number; name: string } | null;
  checked_in_by?: { id: number; name: string } | null;
  ticket_type?: { id: number; name: string } | null;
  event?: { id: number; name: string } | null;
};

export type ActivityItem = {
  id: number;
  event_id?: number | null;
  ticket_code?: string | null;
  action: 'verify' | 'checkin' | 'sell' | 'refund';
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
