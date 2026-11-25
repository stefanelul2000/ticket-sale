import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import { api } from '../../../lib/api';
import { Loading } from '../../components/ui/Misc';
import { EventCard, PublicNotFound } from './PublicEventPage';
import type { PublicEvent } from './PublicEventPage';

type PublicTicket = { ticket_code: string; ticket_number: number; ticket_type?: string | null; status: 'valid' | 'used' | 'not_assigned'; event: PublicEvent };

export function PublicTicketPage() {
  const t = useT();
  const { code } = useParams();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!code) return;
    api.publicTicket(code).then(setTicket).catch(() => setMissing(true));
  }, [code]);

  useEffect(() => {
    if (ticket) document.title = `${ticket.event.name} · Atelier Săcelean`;
  }, [ticket]);

  if (missing) return <PublicNotFound />;
  if (!ticket) return <Loading />;

  const tone = ticket.status === 'valid' ? 'bg-okbg text-ok border-okline' : ticket.status === 'used' ? 'bg-surface2 text-soft border-line' : 'bg-warnbg text-warn border-transparent';

  return (
    <div className="space-y-5">
      <div className={clsx('flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4', tone)}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{t('public.yourInvitation')}</div>
          <div className="font-display text-xl font-bold">{t(`public.status.${ticket.status}` as const)}</div>
        </div>
        <div className="text-right font-mono text-sm">
          {ticket.ticket_code}
          <div className="font-sans text-xs opacity-80">
            #{ticket.ticket_number}
            {ticket.ticket_type ? ` · ${ticket.ticket_type}` : ''}
          </div>
        </div>
      </div>
      <EventCard event={ticket.event} />
    </div>
  );
}
