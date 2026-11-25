import { localeTag, useI18n } from '../i18n';

const lang = () => localeTag(useI18n.getState().lang);

export const fmtDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export const fmtDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { dateStyle: 'long' }).format(new Date(value)) : '—';

export const fmtWeekdayDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : '—';

export const fmtTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

export const fmtNumber = (n: number | null | undefined) => (n === null || n === undefined ? '—' : new Intl.NumberFormat(lang()).format(n));

export const fmtPercent = (ratio: number | null | undefined) =>
  ratio === null || ratio === undefined ? '—' : new Intl.NumberFormat(lang(), { style: 'percent', maximumFractionDigits: 0 }).format(ratio);

/** ISO from the API -> value for <input type="datetime-local"> in the browser's timezone. */
export const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** datetime-local value is sent as-is: the server interprets it in its own timezone (Europe/Bucharest). */
export const fromLocalInput = (value: string) => (value ? value : null);

export type EventPhase = 'upcoming' | 'today' | 'past' | 'undated';

export function eventPhase(startsAt?: string | null, endsAt?: string | null): EventPhase {
  if (!startsAt) return 'undated';
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 6 * 3600 * 1000);
  const now = new Date();
  const sameDay = start.toDateString() === now.toDateString();
  if (now > end && !sameDay) return 'past';
  if (sameDay || (now >= start && now <= end)) return 'today';
  return 'upcoming';
}
