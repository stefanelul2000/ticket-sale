import type { PrintTemplate, TemplateElement } from '../types';
import { ticketUrl } from './ticketCode';
import type { PrintTicket } from './ticketPrint';

type QrModule = typeof import('qrcode');
type BarcodeModule = typeof import('jsbarcode');

export type TemplateContext = {
  publicUrl: string;
  eventSlug: string;
  photosUrl?: string | null;
};

/** A rendered element: where it goes (template pixels) and its pixels. */
export type Overlay = { x: number; y: number; w: number; h: number; canvas: HTMLCanvasElement };

let libs: Promise<[QrModule, BarcodeModule]> | null = null;
const loadLibs = () =>
  (libs ??= Promise.all([
    import('qrcode').then((m) => ((m as unknown as { default?: QrModule }).default ?? m) as QrModule),
    import('jsbarcode').then((m) => ((m as unknown as { default?: BarcodeModule }).default ?? m) as BarcodeModule),
  ]));

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(url: string) {
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Cannot load ${url}`));
        img.src = url;
      }),
    );
  }
  return images.get(url)!;
}

const FONTS: Record<string, string> = {
  sans: 'Manrope, ui-sans-serif, system-ui, sans-serif',
  display: '"Bricolage Grotesque", Manrope, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

export function qrValue(el: TemplateElement, ticket: PrintTicket, ctx: TemplateContext) {
  if (el.qr_content === 'photos' && ctx.photosUrl) return ctx.photosUrl;
  if (el.qr_content === 'event') return `${ctx.publicUrl.replace(/\/+$/, '')}/e/${ctx.eventSlug}`;
  return ticketUrl(ctx.publicUrl, ticket.ticket_code);
}

export function textValue(el: TemplateElement, ticket: PrintTicket) {
  let v = '';
  if (el.type === 'number') v = `${el.prefix ?? ''}${String(ticket.ticket_number).padStart(el.digits ?? 3, '0')}`;
  else if (el.type === 'name') v = ticket.name ?? '';
  else if (el.type === 'code') v = `${el.prefix ?? ''}${ticket.ticket_code}`;
  return el.uppercase ? v.toLocaleUpperCase('ro-RO') : v;
}

function box(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function renderElement(el: TemplateElement, ticket: PrintTicket, tpl: PrintTemplate, ctx: TemplateContext): Promise<Overlay | null> {
  const [QRCode, JsBarcode] = await loadLibs();
  const x = el.x * tpl.width_px;
  const y = el.y * tpl.height_px;
  const w = el.w * tpl.width_px;
  const h = el.h * tpl.height_px;
  const out = box(w, h);
  const c = out.getContext('2d')!;
  const white = (el.background ?? (el.type === 'qr' || el.type === 'barcode' ? 'white' : 'none')) === 'white';
  if (white) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, out.width, out.height);
  }

  if (el.type === 'qr') {
    const size = Math.floor(Math.min(out.width, out.height));
    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, qrValue(el, ticket, ctx), {
      errorCorrectionLevel: 'M',
      margin: white ? 1 : 2,
      width: size,
      color: { dark: el.color && el.color !== '#ffffff' ? el.color : '#000000', light: '#ffffff' },
    });
    c.imageSmoothingEnabled = false;
    c.drawImage(qr, Math.floor((out.width - qr.width) / 2), Math.floor((out.height - qr.height) / 2));
    return { x, y, w, h, canvas: out };
  }

  if (el.type === 'barcode') {
    const showText = el.show_text ?? true;
    const pad = Math.round(out.height * 0.06);
    const textH = showText ? Math.round(out.height * 0.26) : 0;
    const bars = document.createElement('canvas');
    JsBarcode(bars, ticket.ticket_code, { format: 'CODE128', width: 2, height: 100, margin: 0, displayValue: false, background: '#ffffff', lineColor: el.color || '#000000' });
    const targetW = out.width - pad * 2;
    const targetH = out.height - pad * 2 - textH;
    c.imageSmoothingEnabled = false;
    // Whole-pixel module width keeps the bars crisp for scanners (when the box is wide enough).
    const scale = targetW >= bars.width ? Math.floor(targetW / bars.width) : targetW / bars.width;
    const drawW = bars.width * scale;
    c.drawImage(bars, Math.round((out.width - drawW) / 2), pad, Math.round(drawW), Math.max(1, targetH));
    if (showText) {
      c.fillStyle = el.color || '#000000';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      let size = textH * 0.85;
      c.font = `700 ${size}px ${FONTS.mono}`;
      while (c.measureText(ticket.ticket_code).width > targetW && size > 6) {
        size -= 1;
        c.font = `700 ${size}px ${FONTS.mono}`;
      }
      c.fillText(ticket.ticket_code, out.width / 2, out.height - pad - textH / 2);
    }
    return { x, y, w, h, canvas: out };
  }

  const text = textValue(el, ticket);
  if (!text) return white ? { x, y, w, h, canvas: out } : null;
  const family = FONTS[el.font ?? 'sans'] ?? FONTS.sans;
  const weight = el.bold ? 700 : 500;
  const padX = out.height * 0.12;
  let size = out.height * 0.78;
  c.font = `${weight} ${size}px ${family}`;
  while (c.measureText(text).width > out.width - padX * 2 && size > 6) {
    size -= 1;
    c.font = `${weight} ${size}px ${family}`;
  }
  c.fillStyle = el.color || '#000000';
  c.textBaseline = 'middle';
  const align = el.align ?? 'left';
  c.textAlign = align;
  const tx = align === 'left' ? padX : align === 'right' ? out.width - padX : out.width / 2;
  c.fillText(text, tx, out.height / 2 + size * 0.04);
  return { x, y, w, h, canvas: out };
}

export async function renderOverlays(tpl: PrintTemplate, ticket: PrintTicket, ctx: TemplateContext): Promise<Overlay[]> {
  const out: Overlay[] = [];
  for (const el of tpl.elements) {
    const o = await renderElement(el, ticket, tpl, ctx);
    if (o) out.push(o);
  }
  return out;
}

/** Full invitation (design + elements) as a canvas at the design's native resolution. */
export async function renderTemplateCanvas(tpl: PrintTemplate, ticket: PrintTicket, ctx: TemplateContext) {
  const bg = await loadImage(tpl.image_url);
  const canvas = box(tpl.width_px, tpl.height_px);
  const c = canvas.getContext('2d')!;
  c.drawImage(bg, 0, 0, tpl.width_px, tpl.height_px);
  c.imageSmoothingEnabled = false;
  for (const o of await renderOverlays(tpl, ticket, ctx)) c.drawImage(o.canvas, Math.round(o.x), Math.round(o.y));
  return canvas;
}

export const canvasBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, quality));
