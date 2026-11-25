import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import { api } from '../../../lib/api';
import { eventPhase, fmtTime, fmtWeekdayDate } from '../../../lib/format';
import { Loading } from '../../components/ui/Misc';
import { IconCalendar, IconHeart, IconPhoto, IconPin } from '../../components/Icons';

export type PublicEvent = {
  slug: string;
  name: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string | null;
  city?: string | null;
  is_public?: boolean;
  donation_url?: string | null;
  photos_url?: string | null;
};

/** Only http(s) links are rendered (the API validates too). */
const safeHref = (url?: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

export function EventCard({ event, top }: { event: PublicEvent; top?: ReactNode }) {
  const t = useT();
  const donate = safeHref(event.donation_url);
  const photos = safeHref(event.photos_url);
  const phase = eventPhase(event.starts_at, event.ends_at);
  const place = [event.venue, event.city].filter(Boolean).join(', ');

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="bg-navy px-6 py-8 text-white sm:px-8">
        {top}
        <p className="text-sm font-semibold uppercase tracking-wider text-sky">{t(`public.phase.${phase}` as const)}</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">{event.name}</h1>
        <div className="mt-4 space-y-1.5 text-white/85">
          {event.starts_at && (
            <p className="flex items-center gap-2">
              <IconCalendar size={18} /> {fmtWeekdayDate(event.starts_at)}, {fmtTime(event.starts_at)}
            </p>
          )}
          {place && (
            <p className="flex items-center gap-2">
              <IconPin size={18} /> {place}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-6 px-6 py-6 sm:px-8">
        {event.description && <p className="whitespace-pre-line leading-relaxed text-ink">{event.description}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {donate && (
            <a href={donate} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-xl bg-accent p-4 text-onaccent transition-colors hover:bg-accentstrong">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20"><IconHeart size={22} /></span>
              <span>
                <span className="block font-display text-lg font-bold">{t('public.donate')}</span>
                <span className="block text-sm opacity-90">{t('public.donateHint')}</span>
              </span>
            </a>
          )}
          {photos ? (
            <a href={photos} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-xl border-2 border-accent p-4 text-ink transition-colors hover:bg-accenttint">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accenttint text-accent"><IconPhoto size={22} /></span>
              <span>
                <span className="block font-display text-lg font-bold">{t('public.photos')}</span>
                <span className="block text-sm text-soft">{t('public.photosHint')}</span>
              </span>
            </a>
          ) : (
            <div className={clsx('flex items-center gap-4 rounded-xl border border-dashed border-linestrong p-4 text-soft')}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2"><IconPhoto size={22} /></span>
              <span className="text-sm">{t('public.photosSoon')}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function PublicEventPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.publicEvent(slug).then(setEvent).catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    if (event) document.title = `${event.name} · Atelier Săcelean`;
  }, [event]);

  if (missing) return <PublicNotFound />;
  if (!event) return <Loading />;
  return <EventCard event={event} />;
}

export function PublicNotFound() {
  const t = useT();
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
      <h1 className="text-2xl font-bold">{t('public.notFound')}</h1>
      <p className="mt-2 text-soft">{t('public.notFoundHint')}</p>
      <Link to="/e" className="mt-6 inline-flex h-10 items-center rounded bg-accent px-4 text-sm font-semibold text-onaccent">
        {t('public.allEvents')}
      </Link>
    </div>
  );
}
