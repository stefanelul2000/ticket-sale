import { api } from './api';
import type { PrintTemplate } from '../types';
import { prepareFonts, renderTicketImages } from './ticketPrint';
import { canvasBlob, renderTemplateCanvas } from './templateRender';

/** The bits of an event needed to draw its e-ticket (GET /events/{id} or /events/{id}/design). */
export type DesignEvent = {
  name: string;
  slug: string;
  photos_url?: string | null;
  print_template?: PrintTemplate | null;
  ticket_types?: { name: string }[];
};

export type DesignTicket = { ticket_code: string; ticket_number: number; name?: string | null };

export type DesignContext = {
  publicUrl: string;
  orgName: string;
  labels: { guest: string; scanHint: string };
};

/** The event's designed e-ticket for one ticket (custom design, else the standard card) as a small JPEG/PNG. */
export async function renderEticketDesign(event: DesignEvent, tk: DesignTicket, ctx: DesignContext): Promise<Blob> {
  await prepareFonts();
  const tpl = event.print_template?.elements?.length ? event.print_template : null;
  const pt = { ticket_code: tk.ticket_code, ticket_number: tk.ticket_number, name: tk.name ?? null, ticket_type: event.ticket_types?.[0]?.name };
  if (tpl) {
    const full = await renderTemplateCanvas(tpl, pt, { publicUrl: ctx.publicUrl, eventSlug: event.slug, photosUrl: event.photos_url });
    const scale = Math.min(1, 1600 / full.width);
    const small = document.createElement('canvas');
    small.width = Math.round(full.width * scale);
    small.height = Math.round(full.height * scale);
    const c = small.getContext('2d')!;
    c.imageSmoothingQuality = 'high';
    c.drawImage(full, 0, 0, small.width, small.height);
    return canvasBlob(small, 'image/jpeg', 0.86);
  }
  const imgs = await renderTicketImages(pt, {
    eventName: event.name,
    dateLine: '',
    publicUrl: ctx.publicUrl,
    orgName: ctx.orgName,
    labels: ctx.labels,
    pad: 3,
  });
  return imgs.combined;
}

const designCache = new Map<number, Promise<DesignEvent>>();

/** Email an assigned ticket as an e-ticket, attaching the event's design when it can be drawn. */
export async function emailTicketWithDesign(eventId: number | null | undefined, tk: DesignTicket, ctx: DesignContext) {
  let design: Blob | null = null;
  if (eventId) {
    try {
      if (!designCache.has(eventId)) designCache.set(eventId, api.eventDesign(eventId));
      design = await renderEticketDesign(await designCache.get(eventId)!, tk, ctx);
    } catch {
      designCache.delete(eventId);
      design = null; // the email still carries the QR code
    }
  }
  return api.emailTicket(tk.ticket_code, design);
}
