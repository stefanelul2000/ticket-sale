import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Link } from 'react-router-dom';
import { useRoleId } from '../hooks/useRoleId';

type EventType = {
  id: number;
  name: string;
  capacity?: number | null;
  tickets_generated?: number;
  tickets_sold?: number;
};

type TicketType = {
  id: number;
  name: string;
  kind: string;
  price: number;
  event_id: number;
};

type BundleTicket = {
  ticket_code: string;
  ticket_number: number;
  ticket_type?: string | null;
  name?: string | null;
  sold?: boolean;
};

type Bundle = {
  eventId: number;
  eventName: string;
  tickets: BundleTicket[];
};

type JsBarcodeModule = typeof import('jsbarcode');
type JsZipModule = typeof import('jszip');
type QrModule = typeof import('qrcode');

let jsBarcodePromise: Promise<JsBarcodeModule> | null = null;
let jsZipPromise: Promise<JsZipModule> | null = null;
let qrPromise: Promise<QrModule> | null = null;

const loadJsBarcode = async () => {
  if (!jsBarcodePromise) {
    jsBarcodePromise = import('jsbarcode').then((mod) => ((mod as any).default ?? mod) as JsBarcodeModule);
  }
  return jsBarcodePromise;
};

const loadJsZip = async () => {
  if (!jsZipPromise) {
    jsZipPromise = import('jszip').then((mod) => ((mod as any).default ?? mod) as JsZipModule);
  }
  return jsZipPromise;
};

const loadQr = async () => {
  if (!qrPromise) {
    qrPromise = import('qrcode').then((mod) => ((mod as any).default ?? mod) as QrModule);
  }
  return qrPromise;
};

const safeFileName = (value: string) => value.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'event';

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));

/** Print-quality images for one ticket: combined card, QR only, CODE128 only. */
async function renderTicketImages(ticket: BundleTicket, eventName: string, pad: number) {
  const [JsBarcode, QRCode] = await Promise.all([loadJsBarcode(), loadQr()]);

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, ticket.ticket_code, { errorCorrectionLevel: 'M', margin: 2, width: 600, color: { dark: '#000000', light: '#ffffff' } });

  const bar = document.createElement('canvas');
  JsBarcode(bar, ticket.ticket_code, {
    format: 'CODE128',
    width: 4,
    height: 180,
    margin: 24,
    displayValue: true,
    font: 'monospace',
    fontOptions: 'bold',
    fontSize: 40,
    textMargin: 8,
    background: '#ffffff',
    lineColor: '#000000',
  });

  // Combined card: QR left, CODE128 + text right. 1800x700 px (~6x2.3 in at 300 dpi).
  const card = document.createElement('canvas');
  card.width = 1800;
  card.height = 700;
  const ctx = card.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, card.width, card.height);
  ctx.drawImage(qr, 40, 50, 600, 600);

  const rightX = 700;
  const rightW = card.width - rightX - 40;
  const barScale = Math.min(1, rightW / bar.width);
  const barW = bar.width * barScale;
  const barH = bar.height * barScale;
  ctx.drawImage(bar, rightX + (rightW - barW) / 2, 60, barW, barH);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 44px sans-serif';
  const number = `#${String(ticket.ticket_number).padStart(pad, '0')}`;
  ctx.fillText(number + (ticket.ticket_type ? `  ·  ${ticket.ticket_type}` : ''), rightX, 60 + barH + 50, rightW);
  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#333333';
  ctx.fillText(eventName, rightX, 60 + barH + 115, rightW);

  return {
    combined: await canvasToBlob(card),
    qr: await canvasToBlob(qr),
    code128: await canvasToBlob(bar),
  };
}

export function EventsIndexPage() {
  const roleId = useRoleId();
  const canManageEvents = roleId >= 4;
  const [events, setEvents] = useState<EventType[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [section, setSection] = useState<'events' | 'tickets'>('events');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);

  const [newEvent, setNewEvent] = useState({ name: '', capacity: '' });
  const [newTicketType, setNewTicketType] = useState({ event_id: '', name: '', price: '', kind: 'paid' });
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('');

  const [generateState, setGenerateState] = useState<Record<number, { ticket_type_id: string; count: string }>>({});

  useEffect(() => {
    if (!canManageEvents) return;
    loadEvents();
    loadTicketTypes();
  }, [canManageEvents]);

  const setLoading = (key: string | null) => setLoadingKey(key);
  const isLoading = (key: string) => loadingKey === key;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast((val) => (val === message ? null : val)), 4000);
  };

  const loadEvents = async () => {
    try {
      const res = await api.events();
      setEvents(res);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load events.');
    }
  };

  const loadTicketTypes = async () => {
    try {
      const res = await api.ticketTypes();
      setTicketTypes(res);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load ticket types.');
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name) {
      showToast('Event name is required.');
      return;
    }
    setLoading('create-event');
    try {
      const payload: any = { name: newEvent.name };
      if (newEvent.capacity) payload.capacity = Number(newEvent.capacity);
      const created = await api.createEvent(payload);
      setEvents((prev) => [...prev, created]);
      setNewEvent({ name: '', capacity: '' });
      showToast('Event created.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to create event.');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteEvent = async (event: EventType) => {
    if (!window.confirm(`Delete event "${event.name}"?`)) return;
    setLoading(`delete-event-${event.id}`);
    try {
      await api.deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      showToast('Event deleted.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to delete event.');
    } finally {
      setLoading(null);
    }
  };

  const handleCreateTicketType = async () => {
    if (!newTicketType.event_id || !newTicketType.name) {
      showToast('Select an event and name the ticket type.');
      return;
    }
    setLoading('create-ticket');
    try {
      const payload = {
        event_id: Number(newTicketType.event_id),
        name: newTicketType.name,
        kind: newTicketType.kind,
        price: Number(newTicketType.price || 0),
      };
      const created = await api.createTicketType(payload);
      setTicketTypes((prev) => [...prev, created]);
      setNewTicketType({ event_id: '', name: '', price: '', kind: 'paid' });
      showToast('Ticket type created.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to create ticket type.');
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateTicketType = async (type: TicketType, updates: Partial<TicketType>) => {
    setLoading(`update-ticket-${type.id}`);
    try {
      const payload: any = {
        event_id: updates.event_id ?? type.event_id,
        name: updates.name ?? type.name,
        kind: updates.kind ?? type.kind,
        price: updates.price ?? type.price,
      };
      const next = await api.updateTicketType(type.id, payload);
      setTicketTypes((prev) => prev.map((tt) => (tt.id === type.id ? next : tt)));
      showToast('Ticket type updated.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to update ticket type.');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteTicketType = async (type: TicketType) => {
    if (!window.confirm(`Delete ticket type "${type.name}"?`)) return;
    setLoading(`delete-ticket-${type.id}`);
    try {
      await api.deleteTicketType(type.id);
      setTicketTypes((prev) => prev.filter((tt) => tt.id !== type.id));
      showToast('Ticket type deleted.');
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to delete ticket type.');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateTickets = async (event: EventType) => {
    const state = generateState[event.id];
    if (!state?.ticket_type_id || !state.count) {
      showToast('Select ticket type and count.');
      return;
    }
    setLoading(`generate-${event.id}`);
    try {
      const payload = {
        event_id: event.id,
        ticket_type_id: Number(state.ticket_type_id),
        count: Number(state.count),
      };
      const res = await api.generate(payload);
      showToast(`Generated ${res.generated} tickets (#${res.start}–#${res.end}).`);
      setGenerateState((prev) => ({ ...prev, [event.id]: { ticket_type_id: '', count: '' } }));
      await loadEvents();
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to generate tickets.');
    } finally {
      setLoading(null);
    }
  };

  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

  const loadTicketsForEvent = async (event: EventType) => {
    setLoading(`load-codes-${event.id}`);
    try {
      const res = await api.eventTickets(event.id);
      const tickets: BundleTicket[] = res?.tickets || [];
      if (!tickets.length) {
        showToast('No tickets generated for this event yet.');
        return;
      }
      setBundle({ eventId: event.id, eventName: event.name, tickets });
      showToast(`${tickets.length} tickets ready for download.`);
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to load tickets.');
    } finally {
      setLoading(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const csvCell = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    // Quote everything; neutralise spreadsheet formulas.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const padFor = (target: Bundle) => Math.max(3, String(Math.max(...target.tickets.map((t) => t.ticket_number))).length);

  const fileBase = (target: Bundle, t: BundleTicket) => `${String(t.ticket_number).padStart(padFor(target), '0')}_${t.ticket_code}`;

  const downloadCsv = (target: Bundle) => {
    const pad = padFor(target);
    const rows = [['ticket_number', 'ticket_code', 'ticket_type', 'event', 'name', 'sold', 'image_file'].map(csvCell).join(',')];
    target.tickets.forEach((t) =>
      rows.push(
        [String(t.ticket_number).padStart(pad, '0'), t.ticket_code, t.ticket_type ?? '', target.eventName, t.name ?? '', t.sold ? 'yes' : 'no', `${fileBase(target, t)}.png`]
          .map(csvCell)
          .join(','),
      ),
    );
    // BOM so Excel opens UTF-8 (diacritics) correctly.
    downloadBlob(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `${safeFileName(target.eventName)}-tickets.csv`);
  };

  const downloadBarcodesZip = async (target: Bundle) => {
    if (!target.tickets.length) {
      showToast('No tickets to export.');
      return;
    }
    setLoading('zip-barcodes');
    setZipProgress({ done: 0, total: target.tickets.length });
    try {
      const JSZip = await loadJsZip();
      const zip = new JSZip();
      const pad = padFor(target);
      let done = 0;
      for (const t of target.tickets) {
        const images = await renderTicketImages(t, target.eventName, pad);
        const base = fileBase(target, t);
        zip.file(`tickets/${base}.png`, images.combined);
        zip.file(`qr/${base}.png`, images.qr);
        zip.file(`code128/${base}.png`, images.code128);
        done += 1;
        if (done % 10 === 0 || done === target.tickets.length) {
          setZipProgress({ done, total: target.tickets.length });
          await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
        }
      }
      const pad2 = (n: number) => String(n).padStart(pad, '0');
      const manifest = [['ticket_number', 'ticket_code', 'ticket_type', 'file'].map(csvCell).join(',')];
      target.tickets.forEach((t) => manifest.push([pad2(t.ticket_number), t.ticket_code, t.ticket_type ?? '', `${fileBase(target, t)}.png`].map(csvCell).join(',')));
      zip.file('tickets.csv', '\ufeff' + manifest.join('\r\n'));
      zip.file(
        'README.txt',
        [
          `Event: ${target.eventName}`,
          `Tickets: ${target.tickets.length}`,
          '',
          'tickets/  - print-ready card: QR code + CODE128 barcode + code + ticket number (1800x700 px, ~6x2.3 in at 300 dpi)',
          'qr/       - QR code only (600x600 px)',
          'code128/  - CODE128 barcode only, with the code printed below',
          'tickets.csv - list of codes and image file names for mail merge',
          '',
          'Every ticket must be SOLD/ASSIGNED in the app before it can be checked in at the door.',
        ].join('\r\n'),
      );
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      downloadBlob(blob, `${safeFileName(target.eventName)}-barcodes.zip`);
      showToast(`ZIP with ${target.tickets.length} tickets downloaded.`);
    } catch (err: any) {
      showToast(`Barcode export failed: ${err?.message ?? 'unknown error'}`);
    } finally {
      setZipProgress(null);
      setLoading(null);
    }
  };

  const filteredTicketTypes = useMemo(() => {
    if (!ticketTypeFilter) return ticketTypes;
    return ticketTypes.filter((tt) => String(tt.event_id) === ticketTypeFilter);
  }, [ticketTypes, ticketTypeFilter]);

  if (!canManageEvents) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Events</h1>
          <p className="text-sm text-slate-400">Manage events, ticket types, and ticket generation.</p>
        </div>
        <Card title="Insufficient role">
          <p className="text-sm text-slate-400">
            You need the Manager role (or higher) to administer events. Ask an administrator if you require access.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Events</h1>
          <p className="text-sm text-slate-400">Manage events, ticket types, and ticket generation.</p>
        </div>
        {toast && (
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm text-blue-200 shadow">{toast}</div>
        )}
      </div>

      <div className="flex gap-3">
        {[
          { key: 'events', label: 'Events' },
          { key: 'tickets', label: 'Ticket Types' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              section === tab.key ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/60 text-slate-300'
            }`}
            onClick={() => setSection(tab.key as typeof section)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'events' && (
        <div className="space-y-6">
          <Card title="Create event" actions={<Button onClick={handleCreateEvent} disabled={isLoading('create-event')}>Create</Button>}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Event name" value={newEvent.name} onChange={(e) => setNewEvent((prev) => ({ ...prev, name: e.target.value }))} />
              <Input
                label="Capacity (optional)"
                type="number"
                value={newEvent.capacity}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, capacity: e.target.value }))}
              />
            </div>
          </Card>

          <Card title="Events list">
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Capacity</th>
                      <th className="px-3 py-2">Generated</th>
                      <th className="px-3 py-2">Sold</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-slate-900 last:border-none">
                        <td className="px-3 py-3">
                          <div className="font-semibold text-white">{event.name}</div>
                          <div className="text-xs text-slate-400">ID: {event.id}</div>
                        </td>
                        <td className="px-3 py-3">{event.capacity ?? '—'}</td>
                        <td className="px-3 py-3">{event.tickets_generated ?? '—'}</td>
                        <td className="px-3 py-3">{event.tickets_sold ?? '—'}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/events/${event.id}/edit`}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-slate-500"
                            >
                              Edit
                            </Link>
                            <Button variant="ghost" className="text-xs" onClick={() => loadTicketsForEvent(event)} disabled={isLoading(`load-codes-${event.id}`)}>
                              {isLoading(`load-codes-${event.id}`) ? 'Loading…' : 'Download…'}
                            </Button>
                            <Button variant="danger" className="text-xs" onClick={() => handleDeleteEvent(event)} disabled={isLoading(`delete-event-${event.id}`)}>
                              Delete
                            </Button>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-[1fr_120px]">
                            <select
                              className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white"
                              value={generateState[event.id]?.ticket_type_id || ''}
                              onChange={(e) =>
                                setGenerateState((prev) => ({
                                  ...prev,
                                  [event.id]: { ...(prev[event.id] || { count: '' }), ticket_type_id: e.target.value },
                                }))
                              }
                            >
                              <option value="">Pick ticket type</option>
                              {ticketTypes
                                .filter((tt) => tt.event_id === event.id)
                                .map((tt) => (
                                  <option key={tt.id} value={tt.id}>
                                    {tt.name}
                                  </option>
                                ))}
                            </select>
                            <Input
                              label="Count"
                              type="number"
                              value={generateState[event.id]?.count || ''}
                              onChange={(e) =>
                                setGenerateState((prev) => ({
                                  ...prev,
                                  [event.id]: { ...(prev[event.id] || { ticket_type_id: '' }), count: e.target.value },
                                }))
                              }
                            />
                            <Button
                              variant="ghost"
                              className="md:col-span-2"
                              onClick={() => handleGenerateTickets(event)}
                              disabled={isLoading(`generate-${event.id}`)}
                            >
                              Generate tickets
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-4 md:hidden">
              {events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-white">{event.name}</div>
                      <div className="text-xs text-slate-400">ID: {event.id}</div>
                    </div>
                    <Link to={`/events/${event.id}/edit`} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-200">
                      Edit
                    </Link>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <div>
                      <dt className="uppercase text-slate-500">Capacity</dt>
                      <dd className="text-white">{event.capacity ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="uppercase text-slate-500">Generated</dt>
                      <dd className="text-white">{event.tickets_generated ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="uppercase text-slate-500">Sold</dt>
                      <dd className="text-white">{event.tickets_sold ?? '—'}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 space-y-2">
                    <Button variant="ghost" className="w-full text-xs" onClick={() => loadTicketsForEvent(event)} disabled={isLoading(`load-codes-${event.id}`)}>
                      {isLoading(`load-codes-${event.id}`) ? 'Loading…' : 'Download tickets'}
                    </Button>
                    <Button variant="danger" className="w-full text-xs" onClick={() => handleDeleteEvent(event)} disabled={isLoading(`delete-event-${event.id}`)}>
                      Delete
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
                      value={generateState[event.id]?.ticket_type_id || ''}
                      onChange={(e) =>
                        setGenerateState((prev) => ({
                          ...prev,
                          [event.id]: { ...(prev[event.id] || { count: '' }), ticket_type_id: e.target.value },
                        }))
                      }
                    >
                      <option value="">Pick ticket type</option>
                      {ticketTypes
                        .filter((tt) => tt.event_id === event.id)
                        .map((tt) => (
                          <option key={tt.id} value={tt.id}>
                            {tt.name}
                          </option>
                        ))}
                    </select>
                    <Input
                      label="Count"
                      type="number"
                      value={generateState[event.id]?.count || ''}
                      onChange={(e) =>
                        setGenerateState((prev) => ({
                          ...prev,
                          [event.id]: { ...(prev[event.id] || { ticket_type_id: '' }), count: e.target.value },
                        }))
                      }
                    />
                    <Button variant="ghost" className="w-full" onClick={() => handleGenerateTickets(event)} disabled={isLoading(`generate-${event.id}`)}>
                      Generate tickets
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {events.length === 0 && <p className="mt-4 text-sm text-slate-500">No events created yet.</p>}
          </Card>

          {bundle && (
            <Card title={`Download tickets for ${bundle.eventName} (${bundle.tickets.length})`}>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => downloadBarcodesZip(bundle)} disabled={isLoading('zip-barcodes')}>
                  Barcodes ZIP (PNG)
                </Button>
                <Button variant="ghost" onClick={() => downloadCsv(bundle)}>
                  CSV
                </Button>
                <Button variant="ghost" onClick={() => setBundle(null)}>
                  Clear selection
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Each PNG has a QR code and a CODE128 barcode with the same code, so both Zebra scanners and phone cameras can read it.
              </p>
            </Card>
          )}
        </div>
      )}

      {section === 'tickets' && (
        <div className="space-y-6">
          <Card
            title="Create ticket type"
            actions={
              <Button onClick={handleCreateTicketType} disabled={isLoading('create-ticket')}>
                Create
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-400">Event</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"
                  value={newTicketType.event_id}
                  onChange={(e) => setNewTicketType((prev) => ({ ...prev, event_id: e.target.value }))}
                >
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Ticket name" value={newTicketType.name} onChange={(e) => setNewTicketType((prev) => ({ ...prev, name: e.target.value }))} />
              <Input
                label="Price"
                type="number"
                value={newTicketType.price}
                onChange={(e) => setNewTicketType((prev) => ({ ...prev, price: e.target.value }))}
              />
              <div>
                <label className="text-sm text-slate-400">Kind</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"
                  value={newTicketType.kind}
                  onChange={(e) => setNewTicketType((prev) => ({ ...prev, kind: e.target.value }))}
                >
                  {['paid', 'free', 'donation', 'tiered'].map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card title="Ticket types">
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-64">
                <label className="text-sm text-slate-400">Filter by event</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-white"
                  value={ticketTypeFilter}
                  onChange={(e) => setTicketTypeFilter(e.target.value)}
                >
                  <option value="">All events</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Ticket type</th>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Kind</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTicketTypes.map((type) => (
                      <tr key={type.id} className="border-b border-slate-900 last:border-none">
                        <td className="px-3 py-3 font-semibold">{type.name}</td>
                        <td className="px-3 py-3">{events.find((ev) => ev.id === type.event_id)?.name || 'Unknown'}</td>
                        <td className="px-3 py-3 capitalize">{type.kind}</td>
                        <td className="px-3 py-3">${Number(type.price ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="ghost"
                              className="text-xs"
                              onClick={() =>
                                handleUpdateTicketType(type, {
                                  name: prompt('New name', type.name) || type.name,
                                  price: Number(prompt('Price', String(type.price)) || type.price),
                                })
                              }
                              disabled={isLoading(`update-ticket-${type.id}`)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              className="text-xs"
                              onClick={() => handleDeleteTicketType(type)}
                              disabled={isLoading(`delete-ticket-${type.id}`)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 space-y-3 md:hidden">
              {filteredTicketTypes.map((type) => (
                <div key={type.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-white">{type.name}</div>
                      <div className="text-xs text-slate-400">{events.find((ev) => ev.id === type.event_id)?.name || 'Unknown event'}</div>
                    </div>
                    <div className="text-xs capitalize text-slate-300">{type.kind}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">Price: ${Number(type.price ?? 0).toFixed(2)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() =>
                        handleUpdateTicketType(type, {
                          name: prompt('New name', type.name) || type.name,
                          price: Number(prompt('Price', String(type.price)) || type.price),
                        })
                      }
                      disabled={isLoading(`update-ticket-${type.id}`)}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" className="text-xs" onClick={() => handleDeleteTicketType(type)} disabled={isLoading(`delete-ticket-${type.id}`)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {filteredTicketTypes.length === 0 && <p className="text-sm text-slate-500">No ticket types found.</p>}
            </div>
          </Card>
        </div>
      )}

      {loadingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
          <div className="rounded-2xl bg-slate-900/90 p-6 text-center">
            <Spinner size="lg" />
            {zipProgress && (
              <p className="mt-3 text-sm text-slate-200">
                Rendering barcodes {zipProgress.done} / {zipProgress.total}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
