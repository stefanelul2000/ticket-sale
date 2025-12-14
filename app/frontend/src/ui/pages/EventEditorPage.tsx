import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

type EventType = {
  id: number;
  name: string;
  capacity?: number | null;
};

type TicketType = {
  id: number;
  name: string;
  kind: string;
  price: number;
  event_id: number;
};

export function EventEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventType | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadEvent(Number(id));
    loadTicketTypes(Number(id));
  }, [id]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const loadEvent = async (eventId: number) => {
    setLoading(true);
    try {
      const all = await api.events();
      const target = all.find((ev: EventType) => ev.id === eventId);
      if (!target) {
        navigate('/events', { replace: true });
        return;
      }
      setEvent(target);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load event.');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketTypes = async (eventId: number) => {
    try {
      const res = await api.ticketTypes(eventId);
      setTicketTypes(res);
    } catch {
      /* ignore */
    }
  };

  const updateEvent = async () => {
    if (!event) return;
    try {
      const updates: any = { name: event.name };
      if (event.capacity !== undefined) updates.capacity = event.capacity;
      const next = await api.updateEvent(event.id, updates);
      setEvent(next);
      showToast('Event saved.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to save event.');
    }
  };

  const updateTicketType = async (ticket: TicketType, updates: Partial<TicketType>) => {
    try {
      const payload: any = {
        event_id: ticket.event_id,
        name: updates.name ?? ticket.name,
        kind: updates.kind ?? ticket.kind,
        price: updates.price ?? ticket.price,
      };
      const next = await api.updateTicketType(ticket.id, payload);
      setTicketTypes((prev) => prev.map((tt) => (tt.id === ticket.id ? next : tt)));
      showToast('Ticket type saved.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to save ticket type.');
    }
  };

  if (loading || !event) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <span className="text-slate-400">Loading event…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Event</h1>
          <p className="text-sm text-slate-400">Event #{event.id}</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">{toast}</div>
        )}
      </div>

      <Card title="Event details" actions={<Button onClick={updateEvent}>Save</Button>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={event.name} onChange={(e) => setEvent((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
          <Input
            label="Capacity"
            type="number"
            value={event.capacity ?? ''}
            onChange={(e) =>
              setEvent((prev) =>
                prev
                  ? {
                      ...prev,
                      capacity: e.target.value === '' ? null : Number(e.target.value),
                    }
                  : prev,
              )
            }
          />
        </div>
      </Card>

      <Card title="Ticket types">
        <div className="space-y-4">
          {ticketTypes.length === 0 && <p className="text-sm text-slate-500">No ticket types yet. Create them from Events &gt; Ticket Types.</p>}
          {ticketTypes.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Name"
                  value={ticket.name}
                  onChange={(e) => setTicketTypes((prev) => prev.map((tt) => (tt.id === ticket.id ? { ...tt, name: e.target.value } : tt)))}
                />
                <Input
                  label="Price"
                  type="number"
                  value={ticket.price}
                  onChange={(e) =>
                    setTicketTypes((prev) => prev.map((tt) => (tt.id === ticket.id ? { ...tt, price: Number(e.target.value) } : tt)))
                  }
                />
                <div>
                  <label className="text-sm text-slate-400">Kind</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"
                    value={ticket.kind}
                    onChange={(e) =>
                      setTicketTypes((prev) => prev.map((tt) => (tt.id === ticket.id ? { ...tt, kind: e.target.value } : tt)))
                    }
                  >
                    {['paid', 'free', 'donation', 'tiered'].map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Button onClick={() => updateTicketType(ticket, ticket)}>Save ticket type</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

