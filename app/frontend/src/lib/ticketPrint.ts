import { ticketUrl } from './ticketCode';

export type PrintTicket = {
  ticket_code: string;
  ticket_number: number;
  ticket_type?: string | null;
  name?: string | null;
  sold?: boolean;
};

export type PrintContext = {
  eventName: string;
  dateLine: string;
  publicUrl: string;
  orgName: string;
  labels: { guest: string; scanHint: string };
  pad: number;
};

type QrModule = typeof import('qrcode');
type BarcodeModule = typeof import('jsbarcode');

let libs: Promise<[QrModule, BarcodeModule]> | null = null;
let logo: Promise<HTMLImageElement | null> | null = null;

const loadLibs = () =>
  (libs ??= Promise.all([
    import('qrcode').then((m) => ((m as unknown as { default?: QrModule }).default ?? m) as QrModule),
    import('jsbarcode').then((m) => ((m as unknown as { default?: BarcodeModule }).default ?? m) as BarcodeModule),
  ]));

const loadLogo = () =>
  (logo ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/brand/as-mark-512.png';
  }));

/** Make sure the brand fonts are ready before drawing text on canvas. */
export async function prepareFonts() {
  try {
    await Promise.all([
      document.fonts.load('700 64px "Bricolage Grotesque"', 'ĂÂÎȘȚăâîșț'),
      document.fonts.load('700 40px Manrope', 'ĂÂÎȘȚăâîșț'),
      document.fonts.load('400 34px Manrope', 'ĂÂÎȘȚăâîșț'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

const NAVY = '#0f204b';
const SKY = '#00aeef';
const INK = '#24313a';
const SOFT = '#55656f';

/**
 * Renders the print card (1800×700 px ≈ 15×6 cm at 300 dpi) plus QR-only and CODE128-only images.
 * QR = public ticket URL (parents land on the event page; door scanners extract the code).
 * CODE128 = plain code.
 */
export async function renderTicketImages(ticket: PrintTicket, ctx: PrintContext) {
  const [QRCode, JsBarcode] = await loadLibs();
  const logoImg = await loadLogo();
  const url = ticketUrl(ctx.publicUrl, ticket.ticket_code);

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { errorCorrectionLevel: 'M', margin: 2, width: 600, color: { dark: '#000000', light: '#ffffff' } });

  const bar = document.createElement('canvas');
  JsBarcode(bar, ticket.ticket_code, {
    format: 'CODE128',
    width: 4,
    height: 150,
    margin: 20,
    displayValue: true,
    font: 'monospace',
    fontOptions: 'bold',
    fontSize: 38,
    textMargin: 6,
    background: '#ffffff',
    lineColor: '#000000',
  });

  const card = document.createElement('canvas');
  card.width = 1800;
  card.height = 700;
  const c = card.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, card.width, card.height);
  // brand stripe
  c.fillStyle = SKY;
  c.fillRect(0, 0, 22, card.height);

  // QR + hint
  c.drawImage(qr, 50, 40, 580, 580);
  c.fillStyle = SOFT;
  c.font = '400 26px Manrope, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.fillText(ctx.labels.scanHint, 340, 628, 560);
  c.textAlign = 'left';

  const x = 690;
  const right = card.width - 50;
  const width = right - x;

  // header: logo + organisation, ticket number on the right
  if (logoImg) c.drawImage(logoImg, x, 48, 84, 84);
  c.fillStyle = NAVY;
  c.font = '700 30px Manrope, sans-serif';
  c.textBaseline = 'middle';
  c.fillText(ctx.orgName, x + (logoImg ? 104 : 0), 90, width - 260);
  c.textAlign = 'right';
  c.fillStyle = SOFT;
  c.font = '700 34px Manrope, sans-serif';
  c.fillText(`#${String(ticket.ticket_number).padStart(ctx.pad, '0')}`, right, 90);
  c.textAlign = 'left';

  // event
  c.textBaseline = 'top';
  c.fillStyle = NAVY;
  c.font = '700 62px "Bricolage Grotesque", Manrope, sans-serif';
  const titleLines = wrapLines(c, ctx.eventName, width, 2);
  let y = 160;
  for (const line of titleLines) {
    c.fillText(line, x, y, width);
    y += 70;
  }
  c.fillStyle = INK;
  c.font = '400 32px Manrope, sans-serif';
  if (ctx.dateLine) {
    c.fillText(ctx.dateLine, x, y + 4, width);
    y += 46;
  }

  // guest
  if (ticket.name) {
    c.fillStyle = SKY;
    c.font = '700 24px Manrope, sans-serif';
    c.fillText(ctx.labels.guest.toUpperCase(), x, y + 14);
    c.fillStyle = INK;
    c.font = '700 40px Manrope, sans-serif';
    c.fillText(wrapLines(c, ticket.name, width, 1)[0], x, y + 44, width);
  } else if (ticket.ticket_type) {
    c.fillStyle = SOFT;
    c.font = '700 28px Manrope, sans-serif';
    c.fillText(ticket.ticket_type, x, y + 18, width);
  }

  // CODE128 bottom-right
  const maxBarW = Math.min(width, 900);
  const scale = Math.min(1, maxBarW / bar.width, 190 / bar.height);
  const bw = bar.width * scale;
  const bh = bar.height * scale;
  c.drawImage(bar, right - bw, card.height - bh - 30, bw, bh);

  return {
    combined: await canvasToBlob(card),
    qr: await canvasToBlob(qr),
    code128: await canvasToBlob(bar),
    url,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

export const safeFileName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'event';

/** CSV cell: always quoted; neutralises spreadsheet formulas. */
export const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const csvBlob = (rows: unknown[][]) =>
  new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
