import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useT } from '../../i18n';
import { fromLocalInput, toLocalInput } from '../../lib/format';
import type { EventT } from '../../types';
import { Input, Select, Textarea, Toggle } from './ui/Input';

export type EventFormValues = {
  name: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  city: string;
  capacity: string;
  description: string;
  is_public: boolean;
  donation_url: string;
  photos_url: string;
  requests_enabled: boolean;
  eticket_from: string;
  eticket_to: string;
  request_max: string;
  eticket_message: string;
};

export const toFormValues = (e?: Partial<EventT> | null): EventFormValues => ({
  name: e?.name ?? '',
  starts_at: toLocalInput(e?.starts_at),
  ends_at: toLocalInput(e?.ends_at),
  venue: e?.venue ?? '',
  city: e?.city ?? '',
  capacity: e?.capacity ? String(e.capacity) : '',
  description: e?.description ?? '',
  is_public: e?.is_public ?? false,
  donation_url: e?.donation_url ?? '',
  photos_url: e?.photos_url ?? '',
  requests_enabled: e?.requests_enabled ?? false,
  eticket_from: e?.eticket_from ? String(e.eticket_from) : '',
  eticket_to: e?.eticket_to ? String(e.eticket_to) : '',
  request_max: String(e?.request_max ?? 4),
  eticket_message: e?.eticket_message ?? '',
});

export const toPayload = (v: EventFormValues) => ({
  name: v.name.trim(),
  starts_at: fromLocalInput(v.starts_at),
  ends_at: fromLocalInput(v.ends_at),
  venue: v.venue.trim() || null,
  city: v.city.trim() || null,
  capacity: v.capacity ? Number(v.capacity) : null,
  description: v.description.trim() || null,
  is_public: v.is_public,
  donation_url: v.donation_url.trim() || null,
  photos_url: v.photos_url.trim() || null,
  requests_enabled: v.requests_enabled,
  eticket_from: v.eticket_from ? Number(v.eticket_from) : null,
  eticket_to: v.eticket_to ? Number(v.eticket_to) : null,
  request_max: Number(v.request_max) || 4,
  eticket_message: v.eticket_message.trim() || null,
});

export function EventForm({
  initial,
  onSubmit,
  footer,
  formId,
}: {
  initial: EventFormValues;
  onSubmit: (v: EventFormValues) => void;
  footer?: ReactNode;
  formId: string;
}) {
  const t = useT();
  const [v, setV] = useState(initial);
  const set = <K extends keyof EventFormValues>(k: K, val: EventFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(v);
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-5">
      <Input label={t('field.eventName')} required maxLength={255} value={v.name} onChange={(e) => set('name', e.target.value)} placeholder={t('event.namePlaceholder')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('field.startsAt')} type="datetime-local" value={v.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        <Input label={t('field.endsAt')} type="datetime-local" value={v.ends_at} min={v.starts_at || undefined} onChange={(e) => set('ends_at', e.target.value)} />
        <Input label={t('field.venue')} maxLength={255} value={v.venue} onChange={(e) => set('venue', e.target.value)} />
        <Input label={t('field.city')} maxLength={255} value={v.city} onChange={(e) => set('city', e.target.value)} />
        <Input
          label={t('field.capacity')}
          type="number"
          min={1}
          inputMode="numeric"
          value={v.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          hint={t('event.capacityHint')}
        />
      </div>
      <Textarea label={t('field.description')} maxLength={5000} value={v.description} onChange={(e) => set('description', e.target.value)} hint={t('event.descriptionHint')} />
      <div className="space-y-4 rounded-lg border border-line bg-surface2 p-4">
        <Toggle checked={v.is_public} onChange={(val) => set('is_public', val)} label={t('event.publicToggle')} hint={t('event.publicHint')} />
        <Input label={t('field.photosUrl')} type="url" inputMode="url" placeholder="https://cloud.…/s/…" value={v.photos_url} onChange={(e) => set('photos_url', e.target.value)} hint={t('event.photosHint')} />
        <Input label={t('field.donationUrl')} type="url" inputMode="url" placeholder="https://atelier-sacelean.ro/donate" value={v.donation_url} onChange={(e) => set('donation_url', e.target.value)} hint={t('event.donationHint')} />
      </div>
      <div className="space-y-4 rounded-lg border border-line bg-surface2 p-4">
        <Toggle checked={v.requests_enabled} onChange={(val) => set('requests_enabled', val)} label={t('eticket.toggle')} hint={t('eticket.toggleHint')} />
        {v.requests_enabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label={t('eticket.from')} type="number" min={1} inputMode="numeric" value={v.eticket_from} onChange={(e) => set('eticket_from', e.target.value)} placeholder="101" />
              <Input label={t('eticket.to')} type="number" min={1} inputMode="numeric" value={v.eticket_to} onChange={(e) => set('eticket_to', e.target.value)} placeholder="150" />
              <Select label={t('eticket.max')} value={v.request_max} onChange={(e) => set('request_max', e.target.value)}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-soft">{t('eticket.rangeHint')}</p>
            <Textarea label={t('eticket.message')} maxLength={1000} value={v.eticket_message} onChange={(e) => set('eticket_message', e.target.value)} hint={t('eticket.messageHint')} className="min-h-[72px]" />
          </>
        )}
      </div>
      {footer}
    </form>
  );
}
