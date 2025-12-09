import React, { useState } from 'react';
import { api } from '../../../lib/api';
import JSZip from 'jszip';
import JsBarcode from 'jsbarcode';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { inputStyle } from '../../styles';

type EventType = {
  id: number;
  name: string;
  capacity?: number | null;
  tickets_generated?: number;
  tickets_sold?: number;
};
type TicketTypeModel = { id: number; name: string; kind: string; price: number; event_id: number };
type GeneratedBundle = { eventId: number; eventName: string; ticketTypeName: string; codes: string[]; count: number };

type Props = {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  logout: () => Promise<void> | void;
  eventSection: 'events' | 'tickets';
  setEventSection: (section: 'events' | 'tickets') => void;
  events: EventType[];
  setEvents: React.Dispatch<React.SetStateAction<EventType[]>>;
  ticketTypes: TicketTypeModel[];
  setTicketTypes: React.Dispatch<React.SetStateAction<TicketTypeModel[]>>;
  showToast: (msg: string) => void;
  setModal: (modal: any) => void;
  withLoading: (key: string, fn: () => Promise<void>) => Promise<void>;
  isLoading: (key: string) => boolean;
};

export function EventsView({
  header,
  sidebar,
  logout,
  eventSection,
  setEventSection,
  events,
  setEvents,
  ticketTypes,
  setTicketTypes,
  showToast,
  setModal,
  withLoading,
  isLoading,
}: Props) {
  const [newEvent, setNewEvent] = useState({ name: '', capacity: '' });
  const [newTicketType, setNewTicketType] = useState({ event_id: '', name: '', price: '', kind: 'paid' });
  const [showAddTicketType, setShowAddTicketType] = useState(false);
  const [ticketTypeEdits, setTicketTypeEdits] = useState<Record<number, { editing: boolean; name: string; price: number | string; kind: string; event_id: number }>>({});
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('');
  const [ticketGenerateByEvent, setTicketGenerateByEvent] = useState<Record<number, { ticket_type_id: string; count: string; open: boolean }>>({});
  const [eventEdits, setEventEdits] = useState<Record<number, { editing: boolean; name: string; capacity: string }>>({});
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<GeneratedBundle | null>(null);

  const handleDelete = async (type: string, id: number, successLabel: string) => {
    await withLoading(`delete-${type}-${id}`, async () => {
      try {
        if (type === 'event') {
          await api.deleteEvent(id);
          setEvents((prev) => prev.filter((e) => e.id !== id));
        } else if (type === 'ticket') {
          await api.deleteTicketType(id);
          setTicketTypes((prev) => prev.filter((e) => e.id !== id));
        }
        showToast(successLabel);
      } catch (err: any) {
        showToast(err?.response?.data?.message || 'Delete failed.');
      }
    });
  };

  const loadBundleForEvent = async (ev: EventType) => {
    await withLoading(`download-event-${ev.id}`, async () => {
      try {
        const res = await api.eventTickets(ev.id);
        const codes: string[] = res?.codes || [];
        const count = res?.count ?? codes.length;
        if (!codes.length) {
          showToast('No tickets to download for this event.');
          return;
        }
        setGeneratedBundle({
          eventId: ev.id,
          eventName: ev.name,
          ticketTypeName: 'All ticket types',
          codes,
          count,
        });
        showToast(`Loaded ${count} tickets for download.`);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to load tickets.';
        showToast(msg);
      }
    });
  };

  const createBarcodeDataUrl = (code: string) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 3,
      height: 90,
      margin: 12,
      background: '#ffffff',
      lineColor: '#000000',
      displayValue: true,
      fontSize: 16,
    });
    return canvas.toDataURL('image/png');
  };

  const dataUrlToUint8 = (url: string) => {
    const base64 = url.split(',')[1];
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const downloadCsv = (bundle: GeneratedBundle) => {
    const rows = ['ticket_code,event_id,ticket_type,count'];
    bundle.codes.forEach((code) => rows.push(`${code},${bundle.eventId},"${bundle.ticketTypeName}",1`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.eventName}-tickets.csv`;
    link.click();
  };

  const downloadBarcodesPng = (bundle: GeneratedBundle) => {
    const max = 300;
    const subset = bundle.codes.slice(0, max);
    if (!subset.length) {
      showToast('No codes to download.');
      return;
    }
    const lineHeight = 110;
    const width = 560;
    const height = subset.length * lineHeight + 40;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    subset.forEach((code, idx) => {
      const temp = document.createElement('canvas');
      JsBarcode(temp, code, { format: 'CODE128', width: 3, height: 90, margin: 12, background: '#ffffff', lineColor: '#000000', displayValue: true, fontSize: 16 });
      ctx.drawImage(temp, 20, 10 + idx * lineHeight);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${bundle.eventName}-barcodes.png`;
    link.click();
    if (bundle.codes.length > max) {
      showToast(`Downloaded first ${max} barcodes. Use CSV for full list.`);
    }
  };

  const downloadBarcodesZip = async (bundle: GeneratedBundle) => {
    const max = 500;
    const subset = bundle.codes.slice(0, max);
    if (!subset.length) {
      showToast('No codes to download.');
      return;
    }
    await withLoading('zip-barcodes', async () => {
      const zip = new JSZip();
      subset.forEach((code) => {
        const dataUrl = createBarcodeDataUrl(code);
        const bytes = dataUrlToUint8(dataUrl);
        zip.file(`${code}.png`, bytes, { binary: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bundle.eventName}-barcodes.zip`;
      link.click();
      if (bundle.codes.length > max) {
        showToast(`Zipped first ${max} barcodes. Use CSV for full list.`);
      }
    });
  };

  const eventTabs: { key: typeof eventSection; label: string }[] = [
    { key: 'events', label: 'Events' },
    { key: 'tickets', label: 'Ticket Types' },
  ];

  const renderEventSection = () => {
    switch (eventSection) {
      case 'events':
        return (
          <Card
            title="Events"
            action={
              <Button
                variant={showAddEvent ? 'solid' : 'ghost'}
                onClick={() => setShowAddEvent((v) => !v)}
              >
                {showAddEvent ? 'Cancel' : 'Add event'}
              </Button>
            }
          >
            <div style={{ height: 4 }} />

            {showAddEvent && (
              <div className="event-add-row-container">
                <input
                  placeholder="Event name"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Capacity"
                  value={newEvent.capacity}
                  onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                  style={inputStyle}
                />
                <Button
                  onClick={async () => {
                    if (!newEvent.name) {
                      showToast('Event name is required.');
                      return;
                    }
                    let capNum: number | null = null;
                    if (newEvent.capacity.trim() !== '') {
                      const parsed = Number(newEvent.capacity);
                      if (!Number.isFinite(parsed) || parsed < 0) {
                        showToast('Capacity must be a non-negative number.');
                        return;
                      }
                      capNum = parsed;
                    }
                    const created = await api.createEvent({
                      name: newEvent.name,
                      capacity: capNum,
                    });
                    setEvents((prev) => [...prev, created]);
                    setNewEvent({ name: '', capacity: '' });
                    setShowAddEvent(false);
                    showToast(`Event "${created.name}" created.`);
                  }}
                >
                  Create
                </Button>
              </div>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              {events.map((ev) => {
                const saving = isLoading(`save-event-${ev.id}`);
                const deleting = isLoading(`delete-event-${ev.id}`);
                const generating = isLoading(`generate-event-${ev.id}`);
                return (
                  <div key={ev.id} className="event-card">
                    <div className="event-summary-row">
                      <div style={{ display: 'grid', gap: 6 }}>
                        {eventEdits[ev.id]?.editing ? (
                          <>
                            <label style={{ color: 'var(--muted)', fontSize: 13 }}>Event name</label>
                            <input
                              value={eventEdits[ev.id]?.name ?? ev.name}
                              onChange={(e) =>
                                setEventEdits((prev) => ({
                                  ...prev,
                                  [ev.id]: {
                                    ...(prev[ev.id] || { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' }),
                                    name: e.target.value,
                                  },
                                }))
                              }
                              style={inputStyle}
                            />
                            <label style={{ color: 'var(--muted)', fontSize: 13 }}>Capacity</label>
                            <input
                              value={eventEdits[ev.id]?.capacity ?? (ev.capacity?.toString() || '')}
                              placeholder="Capacity"
                              onChange={(e) =>
                                setEventEdits((prev) => ({
                                  ...prev,
                                  [ev.id]: {
                                    ...(prev[ev.id] || { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' }),
                                    capacity: e.target.value,
                                  },
                                }))
                              }
                              style={inputStyle}
                            />
                          </>
                        ) : (
                          <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                            {ev.name}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
                          <span>Capacity: <strong style={{ color: 'var(--text)' }}>{ev.capacity ?? '—'}</strong></span>
                          <span>Generated: <strong style={{ color: 'var(--text)' }}>{ev.tickets_generated ?? 0}</strong></span>
                          <span>Sold: <strong style={{ color: 'var(--text)' }}>{ev.tickets_sold ?? 0}</strong></span>
                          {ev.capacity ? (
                            <span>
                              Remaining capacity:{' '}
                              <strong style={{ color: 'var(--text)' }}>
                                {Math.max(0, ev.capacity - (ev.tickets_generated || 0))}
                              </strong>
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        <Button
                          variant="ghost"
                          disabled={saving}
                          onClick={async () => {
                            const current = eventEdits[ev.id];
                            if (!current?.editing) {
                              setEventEdits((prev) => ({
                                ...prev,
                                [ev.id]: { editing: true, name: ev.name, capacity: ev.capacity?.toString() || '' },
                              }));
                              return;
                            }
                            if (!current.name.trim()) {
                              showToast('Event name is required.');
                              return;
                            }
                            const capStr = current.capacity ?? '';
                            let payloadCapacity: number | null = null;
                            if (capStr.trim() !== '') {
                              const parsed = Number(capStr);
                              if (!Number.isFinite(parsed) || parsed < 0) {
                                showToast('Capacity must be a non-negative number.');
                                return;
                              }
                              // Fix: changed from capNum to parsed
                              if (ev.tickets_generated && parsed < ev.tickets_generated) {
                                showToast(`Capacity cannot be less than tickets already generated (${ev.tickets_generated}).`);
                                return;
                              }
                              payloadCapacity = parsed;
                            } else {
                              showToast('Capacity is required.');
                              return;
                            }
                            await withLoading(`save-event-${ev.id}`, async () => {
                              try {
                                const updated = await api.updateEvent(ev.id, {
                                  name: current.name.trim(),
                                  capacity: payloadCapacity,
                                });
                                setEvents((prev) => prev.map((e) => (e.id === ev.id ? updated : e)));
                                setEventEdits((prev) => ({ ...prev, [ev.id]: { editing: false, name: updated.name, capacity: updated.capacity?.toString() || '' } }));
                                showToast(`Saved event "${updated.name}".`);
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || 'Failed to save event.';
                                showToast(msg);
                                setEventEdits((prev) => ({ ...prev, [ev.id]: { editing: true, name: current.name, capacity: current.capacity ?? '' } }));
                              }
                            });
                          }}
                        >
                          {eventEdits[ev.id]?.editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={deleting}
                          onClick={() =>
                            setModal({
                              title: 'Delete event',
                              message: `Are you sure you want to delete "${ev.name}"? This will remove its ticket types and tickets.`,
                              confirmLabel: deleting ? 'Deleting...' : 'Delete',
                              onConfirm: async () => {
                                await handleDelete('event', ev.id, `Deleted event "${ev.name}".`);
                                setModal(null);
                              },
                            })
                          }
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10, border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                          variant={ticketGenerateByEvent[ev.id]?.open ? 'solid' : 'ghost'}
                          onClick={() =>
                            setTicketGenerateByEvent((prev) => ({
                              ...prev,
                              [ev.id]: { ticket_type_id: '', count: '', open: !prev[ev.id]?.open },
                            }))
                          }
                        >
                          Generate tickets
                        </Button>
                        {ev.tickets_generated ? (
                          <Button
                            variant="ghost"
                            disabled={isLoading(`download-event-${ev.id}`)}
                            onClick={() => loadBundleForEvent(ev)}
                          >
                            {isLoading(`download-event-${ev.id}`) ? 'Loading…' : 'Download tickets'}
                          </Button>
                        ) : null}
                      </div>

                      {ticketGenerateByEvent[ev.id]?.open && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <select
                              style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', width: 220 }}
                              value={ticketGenerateByEvent[ev.id]?.ticket_type_id || ''}
                              onChange={(e) =>
                                setTicketGenerateByEvent((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...(prev[ev.id] || { count: '', open: true }), ticket_type_id: e.target.value },
                                }))
                              }
                            >
                              <option value="">Select ticket type</option>
                              {ticketTypes
                                .filter((tt) => tt.event_id === ev.id)
                                .map((tt) => (
                                  <option key={tt.id} value={tt.id}>
                                    {tt.name} ({tt.kind}) - ${tt.price}
                                  </option>
                                ))}
                            </select>
                            <input
                              placeholder="Ticket count"
                              style={{ ...inputStyle, width: 160 }}
                              value={ticketGenerateByEvent[ev.id]?.count || ''}
                              onChange={(e) =>
                                setTicketGenerateByEvent((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...(prev[ev.id] || { ticket_type_id: '', open: true }), count: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Button
                              disabled={generating}
                              onClick={() => {
                                const entry = ticketGenerateByEvent[ev.id];
                                if (!entry?.ticket_type_id || !entry?.count) {
                                  showToast('Select a ticket type and enter a count to generate tickets.');
                                  return;
                                }
                                const count = Number(entry.count);
                                if (!Number.isFinite(count) || count <= 0) {
                                  showToast('Ticket count must be a positive number.');
                                  return;
                                }
                                const capacityValue =
                                  ev.capacity === null || ev.capacity === undefined ? null : Number(ev.capacity);
                                const remaining =
                                  capacityValue === null || Number.isNaN(capacityValue)
                                    ? null
                                    : Math.max(0, capacityValue - (ev.tickets_generated || 0));
                                if (remaining !== null && count > remaining) {
                                  showToast(`Cannot generate ${count} tickets; only ${remaining} remaining for "${ev.name}".`);
                                  return;
                                }
                                const tt = ticketTypes.find((t) => t.id === Number(entry.ticket_type_id));
                                setModal({
                                  title: 'Generate tickets',
                                  message: `Generate ${count} tickets for "${ev.name}"${tt ? ` (${tt.name})` : ''}?`,
                                  confirmLabel: generating ? 'Working...' : 'Generate',
                                  onConfirm: async () => {
                                    await withLoading(`generate-event-${ev.id}`, async () => {
                                      try {
                                        const res = await api.generate({
                                          event_id: ev.id,
                                          ticket_type_id: Number(entry.ticket_type_id),
                                          count,
                                        });
                                        setGeneratedBundle({
                                          eventId: ev.id,
                                          eventName: ev.name,
                                          ticketTypeName: tt?.name || 'Ticket',
                                          codes: res?.codes || [],
                                          count,
                                        });
                                        setEvents((prev) =>
                                          prev.map((x) =>
                                            x.id === ev.id ? { ...x, tickets_generated: (x.tickets_generated || 0) + count } : x
                                          )
                                        );
                                        setTicketGenerateByEvent((prev) => ({
                                          ...prev,
                                          [ev.id]: { ticket_type_id: '', count: '', open: false },
                                        }));

                                        const formatStart = (data: any, fallback: string) =>
                                          data?.start_code ??
                                          data?.start ??
                                          data?.first_code ??
                                          (Array.isArray(data?.codes) ? data.codes[0] : undefined) ??
                                          fallback;
                                        const formatEnd = (data: any, fallback: string) =>
                                          data?.end_code ??
                                          data?.end ??
                                          (Array.isArray(data?.codes) && data.codes.length ? data.codes[data.codes.length - 1] : undefined) ??
                                          fallback;
                                        const start = formatStart(res, '—');
                                        const end = formatEnd(res, '—');
                                        const range = start !== '—' && end !== '—' ? ` (tickets ${start}–${end})` : '';
                                        showToast(`Generated ${count} tickets for "${ev.name}"${range || '.'}`);
                                      } catch (err: any) {
                                        const msg = err?.response?.data?.message || 'Failed to generate tickets.';
                                        showToast(msg);
                                      }
                                    });
                                    setModal(null);
                                  },
                                });
                              }}
                            >
                              {generating ? 'Working...' : 'Confirm'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {generatedBundle?.eventId === ev.id && (
                        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
                          <button
                            aria-label="Close download panel"
                            onClick={() => setGeneratedBundle(null)}
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              background: 'rgba(255,255,255,0.06)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            ×
                          </button>
                          <div style={{ color: 'var(--muted)' }}>
                            Generated {generatedBundle.count} tickets for "{generatedBundle.eventName}" ({generatedBundle.ticketTypeName})
                          </div>
                          <Button variant="ghost" onClick={() => downloadCsv(generatedBundle)}>
                            Download CSV
                          </Button>
                          <Button variant="ghost" onClick={() => downloadBarcodesPng(generatedBundle)}>
                            Download barcodes (PNG)
                          </Button>
                          <Button variant="ghost" onClick={() => downloadBarcodesZip(generatedBundle)}>
                            Download barcodes (ZIP)
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      case 'tickets':
        return (
          <Card title="Ticket Types">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <Button variant="ghost" onClick={() => setShowAddTicketType((v) => !v)}>
                {showAddTicketType ? 'Close' : 'Add ticket type'}
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
              <label style={{ color: 'var(--muted)', fontSize: 13 }}>Filter by event:</label>
              <select
                value={ticketTypeFilter}
                onChange={(e) => setTicketTypeFilter(e.target.value)}
                style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)', width: 220 }}
              >
                <option value="">All events</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
            {showAddTicketType && (
              <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
                <div className="event-ticket-add-container">
                  <select
                    value={newTicketType.event_id}
                    onChange={(e) => setNewTicketType({ ...newTicketType, event_id: e.target.value })}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="">Event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Name"
                    value={newTicketType.name}
                    onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                    style={inputStyle}
                  />
                  <select
                    value={newTicketType.kind}
                    onChange={(e) => {
                      const nextKind = e.target.value;
                      setNewTicketType({
                        ...newTicketType,
                        kind: nextKind,
                        price: nextKind === 'free' ? '0' : newTicketType.price,
                      });
                    }}
                    style={{ ...inputStyle, background: 'rgba(255,255,255,0.03)' }}
                  >
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                    <option value="donation">Donation</option>
                    <option value="tiered">Tiered</option>
                  </select>
                  <input
                    placeholder="Price"
                    value={newTicketType.price}
                    onChange={(e) => setNewTicketType({ ...newTicketType, price: e.target.value })}
                    disabled={newTicketType.kind === 'free'}
                    style={inputStyle}
                  />
                  <Button
                    onClick={async () => {
                      if (!newTicketType.event_id || !newTicketType.name) return;
                      const created = await api.createTicketType({
                        ...newTicketType,
                        price: Number(newTicketType.price) || 0,
                        event_id: Number(newTicketType.event_id),
                      });
                      setTicketTypes((prev) => [...prev, created]);
                      setNewTicketType({ event_id: '', name: '', price: '', kind: 'paid' });
                      setShowAddTicketType(false);
                      const evName = events.find((e) => String(e.id) === String(created.event_id))?.name || 'event';
                      showToast(`Ticket type "${created.name}" added to "${evName}".`);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {ticketTypes
                .filter((tt) => !ticketTypeFilter || String(tt.event_id) === ticketTypeFilter)
                .map((tt) => {
                  const saving = isLoading(`save-ticket-${tt.id}`);
                  const deleting = isLoading(`delete-ticket-${tt.id}`);
                  const eventName = events.find((ev) => ev.id === tt.event_id)?.name || '—';
                  const editState = ticketTypeEdits[tt.id];
                  const isEditing = editState?.editing;
                  const displayKind = isEditing ? editState?.kind ?? tt.kind : tt.kind;
                  const displayPrice = displayKind === 'free' ? 0 : isEditing ? editState?.price ?? tt.price : tt.price;
                  return (
                    <div key={tt.id} className="ticket-type-card">
                      <div className="ticket-type-card-main-info">
                        <div className="ticket-type-card-name">
                          {isEditing ? (
                            <input
                              value={editState?.name ?? tt.name}
                              onChange={(e) =>
                                setTicketTypeEdits((prev) => ({
                                  ...prev,
                                  [tt.id]: { ...(prev[tt.id] || { editing: true, price: tt.price, kind: tt.kind, name: tt.name }), name: e.target.value },
                                }))
                              }
                              style={inputStyle}
                            />
                          ) : (
                            tt.name
                          )}
                        </div>
                        <div className="ticket-type-card-event">
                          Event: {eventName}
                        </div>
                      </div>
                      <div className="ticket-type-card-details">
                        <span style={{ color: 'var(--muted)' }}>{displayKind}</span>
                        <span style={{ fontWeight: 700 }}>
                          {isEditing ? (
                            <input
                              value={displayPrice}
                              onChange={(e) =>
                                setTicketTypeEdits((prev) => ({
                                  ...prev,
                                  [tt.id]: {
                                    ...(prev[tt.id] || { editing: true, name: tt.name, price: tt.price, kind: tt.kind }),
                                    price: e.target.value,
                                  },
                                }))
                              }
                              style={{ ...inputStyle, width: 110 }}
                              disabled={displayKind === 'free'}
                            />
                          ) : (
                            `$${displayPrice}`
                          )}
                        </span>
                      </div>
                      <div className="ticket-type-card-actions">
                        <Button
                          variant="ghost"
                          disabled={saving}
                          onClick={async () => {
                            const current = ticketTypeEdits[tt.id];
                            if (!current?.editing) {
                              setTicketTypeEdits((prev) => ({
                                ...prev,
                                [tt.id]: { editing: true, name: tt.name, price: tt.price, kind: tt.kind, event_id: tt.event_id },
                              }));
                              return;
                            }
                            if (!current.name.trim()) {
                              showToast('Ticket type name is required.');
                              return;
                            }
                            const payloadKind = current.kind || tt.kind;
                            let payloadPrice = payloadKind === 'free' ? 0 : Number(current.price);
                            if (!Number.isFinite(payloadPrice) || payloadPrice < 0) {
                              showToast('Price must be zero or a positive number.');
                              return;
                            }
                            await withLoading(`save-ticket-${tt.id}`, async () => {
                              try {
                                const updated = await api.updateTicketType(tt.id, {
                                  name: current.name.trim(),
                                  price: payloadPrice,
                                  kind: payloadKind,
                                  event_id: current.event_id || tt.event_id,
                                });
                                setTicketTypes((prev) => prev.map((x) => (x.id === tt.id ? updated : x)));
                                setTicketTypeEdits((prev) => ({
                                  ...prev,
                                  [tt.id]: {
                                    editing: false,
                                    name: updated.name,
                                    price: updated.price,
                                    kind: updated.kind,
                                    event_id: updated.event_id,
                                  },
                                }));
                                showToast(`Saved ticket type "${updated.name}".`);
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || 'Failed to save ticket type.';
                                showToast(msg);
                              }
                            });
                          }}
                        >
                          {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={deleting}
                          onClick={() =>
                            setModal({
                              title: 'Delete ticket type',
                              message: `Delete "${tt.name}"?`,
                              confirmLabel: deleting ? 'Deleting...' : 'Delete',
                              onConfirm: async () => {
                                await handleDelete('ticket', tt.id, `Deleted ticket type "${tt.name}".`);
                                setModal(null);
                              },
                            })
                          }
                        >
                          {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout
      header={header}
      sidebar={sidebar}
      onLogout={logout}
    >
      {generatedBundle && (
        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
          <button
            aria-label="Close download panel"
            onClick={() => setGeneratedBundle(null)}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ×
          </button>
          <div style={{ color: 'var(--muted)' }}>
            Generated {generatedBundle.count} tickets for "{generatedBundle.eventName}" ({generatedBundle.ticketTypeName})
          </div>
          <Button variant="ghost" onClick={() => downloadCsv(generatedBundle)}>
            Download CSV
          </Button>
          <Button variant="ghost" onClick={() => downloadBarcodesPng(generatedBundle)}>
            Download barcodes (PNG)
          </Button>
          <Button variant="ghost" onClick={() => downloadBarcodesZip(generatedBundle)}>
            Download barcodes (ZIP)
          </Button>
        </div>
      )}
      {/* ADDED: Tab Navigation for Events vs Ticket Types */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {eventTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setEventSection(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: eventSection === tab.key ? '2px solid white' : '2px solid transparent',
              color: eventSection === tab.key ? 'white' : 'var(--muted)',
              padding: '10px 4px',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderEventSection()}
    </Layout>
  );
}