import { create } from 'zustand';
import { api } from '../lib/api';
import { eventPhase } from '../lib/format';

export type EventSummary = {
  id: number;
  name: string;
  slug: string;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string | null;
  capacity?: number | null;
  is_public?: boolean;
  tickets_generated?: number;
  tickets_sold?: number;
  tickets_checked_in?: number;
  tickets_walk_in?: number;
};

const KEY = 'ts_event';

/** Today's event, else the next upcoming one, else the most recent. */
function pickDefault(events: EventSummary[]): number | null {
  if (!events.length) return null;
  const today = events.find((e) => eventPhase(e.starts_at, e.ends_at) === 'today');
  if (today) return today.id;
  const upcoming = events
    .filter((e) => eventPhase(e.starts_at, e.ends_at) === 'upcoming')
    .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
  if (upcoming.length) return upcoming[0].id;
  const undated = events.filter((e) => !e.starts_at).sort((a, b) => b.id - a.id);
  if (undated.length) return undated[0].id;
  return events[0].id;
}

type State = {
  events: EventSummary[];
  eventId: number | null;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
  select: (id: number) => void;
  current: () => EventSummary | null;
};

export const useCurrentEvent = create<State>((set, get) => ({
  events: [],
  eventId: null,
  loaded: false,
  load: async (force = false) => {
    if (get().loaded && !force) return;
    try {
      const events: EventSummary[] = await api.eventSummaries();
      const stored = Number(localStorage.getItem(KEY)) || null;
      const keep = get().eventId ?? stored;
      const eventId = keep && events.some((e) => e.id === keep) ? keep : pickDefault(events);
      set({ events, eventId, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  select: (id) => {
    localStorage.setItem(KEY, String(id));
    set({ eventId: id });
  },
  current: () => get().events.find((e) => e.id === get().eventId) ?? null,
}));
