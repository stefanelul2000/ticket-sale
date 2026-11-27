import { useT } from '../i18n';
import { errorMessage } from './api';
import { emailTicketWithDesign } from './eticketDesign';
import { useSettings } from '../state/useSettings';
import { toast } from '../state/useToast';
import type { TicketInfo } from '../types';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sends a ticket to its guest's email; returns the updated ticket, or null after telling the user what went wrong. */
export function useSendTicketEmail() {
  const t = useT();
  const { settings } = useSettings();
  return async (eventId: number | null | undefined, tk: TicketInfo): Promise<TicketInfo | null> => {
    try {
      const sent: TicketInfo = await emailTicketWithDesign(eventId, tk, {
        publicUrl: settings.public_url || window.location.origin,
        orgName: settings.name,
        labels: { guest: t('print.guestLabel'), scanHint: t('print.scanHint') },
      });
      toast(t('assign.emailSent', { email: sent.email ?? '' }), 'ok');
      return sent;
    } catch (err) {
      toast(`${t('assign.emailFailed')} ${errorMessage(err, '')}`.trim(), 'warn');
      return null;
    }
  };
}
