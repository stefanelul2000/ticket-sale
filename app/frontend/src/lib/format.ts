import { localeTag, useI18n } from '../i18n';

const lang = () => localeTag(useI18n.getState().lang);

/** Events happen in Romania: show their times in Romanian time, whatever the viewer's device timezone. */
export const APP_TZ = 'Europe/Bucharest';

export const fmtDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { dateStyle: 'medium', timeStyle: 'short', timeZone: APP_TZ }).format(new Date(value)) : '—';

export const fmtDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { dateStyle: 'long', timeZone: APP_TZ }).format(new Date(value)) : '—';

export const fmtWeekdayDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: APP_TZ }).format(new Date(value)) : '—';

export const fmtTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat(lang(), { hour: '2-digit', minute: '2-digit', timeZone: APP_TZ }).format(new Date(value)) : '—';

export const fmtNumber = (n: number | null | undefined) => (n === null || n === undefined ? '—' : new Intl.NumberFormat(lang()).format(n));

export const fmtPercent = (ratio: number | null | undefined) =>
  ratio === null || ratio === undefined ? '—' : new Intl.NumberFormat(lang(), { style: 'percent', maximumFractionDigits: 0 }).format(ratio);

/** Wall-clock parts of an instant in Romanian time. */
const tzParts = (d: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;
};

/** ISO from the API -> value for <input type="datetime-local"> in Romanian time (what the server stores). */
export const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const p = tzParts(new Date(value));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** datetime-local value is sent as-is: the server interprets it in its own timezone (Europe/Bucharest). */
export const fromLocalInput = (value: string) => (value ? value : null);

export type EventPhase = 'upcoming' | 'today' | 'past' | 'undated';

export function eventPhase(startsAt?: string | null, endsAt?: string | null): EventPhase {
  if (!startsAt) return 'undated';
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 6 * 3600 * 1000);
  const now = new Date();
  const day = (d: Date) => {
    const p = tzParts(d);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const sameDay = day(start) === day(now);
  if (now > end && !sameDay) return 'past';
  if (sameDay || (now >= start && now <= end)) return 'today';
  return 'upcoming';
}
