import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useRoleId } from '../hooks/useRoleId';

type EventSummary = { id: number; name: string; starts_at?: string | null };
type Ticket = {
  id: number;
  event_id: number;
  ticket_number: number;
  ticket_code: string;
  name?: string | null;
  sold_at?: string | null;
  seller?: { name?: string | null; username?: string | null };
  checkin?: boolean;
};

export function TicketsPage() {
  const roleId = useRoleId();
  const canViewTickets = roleId >= 2;
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewTickets) return;
    loadEvents();
  }, [canViewTickets]);

  useEffect(() => {
    if (!canViewTickets || !selectedEventId) {
      setTickets([]);
      return;
    }
    loadTickets(Number(selectedEventId));
  }, [selectedEventId, canViewTickets]);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await api.eventSummaries();
      setEvents(res);
      if (res.length) {
        setSelectedEventId(String(res[0].id));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadTickets = async (eventId: number) => {
    setLoadingTickets(true);
    setError(null);
    try {
      const res = await api.tickets({ event_id: eventId, per_page: 1000 });
      const list = Array.isArray(res?.data) ? res.data : res;
      setTickets(list);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to load tickets.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const selectedEventName = useMemo(() => {
    return events.find((event) => String(event.id) === selectedEventId)?.name;
  }, [events, selectedEventId]);

  const formatSoldAt = (value?: string | null) => {
    if (!value) return 'Unsold';
    return new Date(value).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Tickets</h1>
        <p className="text-sm text-slate-400">Inspect ticket sales per event and review buyer/seller history.</p>
      </div>

      {!canViewTickets ? (
        <Card title="Tickets">
          <p className="text-sm text-slate-400">
            You need at least the Check-in role to view ticket sales. Contact an administrator if you require access.
          </p>
        </Card>
      ) : (
        <>
          <Card
            title="Select event"
            actions={
              loadingEvents ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Spinner size="sm" /> Loading events…
                </div>
              ) : null
            }
          >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Event</label>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={loadingEvents || events.length === 0}
            >
              {events.length === 0 && <option value="">No events found</option>}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-slate-400">
              {selectedEventName ? `Showing tickets for ${selectedEventName}.` : 'Select an event to load tickets.'}
            </p>
          </div>
        </div>
          </Card>

          <Card title="Ticket ledger">
        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
        {loadingTickets ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Spinner size="lg" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {selectedEventId ? 'No tickets found for this event yet.' : 'Select an event to view its tickets.'}
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Ticket #</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Buyer</th>
                      <th className="px-3 py-2">Sold by</th>
                      <th className="px-3 py-2">Sold at</th>
                      <th className="px-3 py-2">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-slate-900/60 last:border-0">
                        <td className="px-3 py-3 font-semibold text-white">{ticket.ticket_number}</td>
                        <td className="px-3 py-3 text-slate-300">{ticket.ticket_code}</td>
                        <td className="px-3 py-3">
                          {ticket.name ? <span className="font-medium text-white">{ticket.name}</span> : <span className="text-slate-500">Unsold</span>}
                        </td>
                        <td className="px-3 py-3">{ticket.seller?.name ?? <span className="text-slate-500">—</span>}</td>
                        <td className="px-3 py-3">{formatSoldAt(ticket.sold_at)}</td>
                        <td className="px-3 py-3">
                          {ticket.checkin ? <span className="text-emerald-300">Checked in</span> : <span className="text-slate-500">Not checked in</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3 md:hidden">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white">#{ticket.ticket_number}</div>
                    <span className="text-xs text-slate-400">{ticket.ticket_code}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-500">Buyer:</span>{' '}
                    {ticket.name ? <span className="font-medium text-white">{ticket.name}</span> : <span className="text-slate-500">Unsold</span>}
                  </div>
                  <div className="text-slate-300">Sold by: {ticket.seller?.name ?? '—'}</div>
                  <div className="text-slate-300">Sold at: {formatSoldAt(ticket.sold_at)}</div>
                  <div className="mt-1 text-sm">{ticket.checkin ? <span className="text-emerald-300">Checked in</span> : <span className="text-slate-500">Not checked in</span>}</div>
                </div>
              ))}
            </div>
          </>
        )}
          </Card>
        </>
      )}
    </div>
  );
}
