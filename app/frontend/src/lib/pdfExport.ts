import type { PrintTemplate } from '../types';
import type { PrintTicket } from './ticketPrint';
import { loadImage, renderOverlays } from './templateRender';
import type { TemplateContext } from './templateRender';

export type PdfLayout = 'single' | 'a4';

/**
 * Print-ready PDF. The design is embedded once and reused on every page; only the small
 * per-invitation elements (QR, barcode, texts) are added per page, so files stay small.
 * single = one invitation per page at its real size; a4 = stacked on A4 with cut marks.
 */
export async function buildTemplatePdf(
  tpl: PrintTemplate,
  tickets: PrintTicket[],
  ctx: TemplateContext,
  layout: PdfLayout,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const W = tpl.width_mm;
  const H = (W * tpl.height_px) / tpl.width_px;
  const mmPerPx = W / tpl.width_px;

  // Background as JPEG (white under any transparency), embedded once via alias.
  const bgImg = await loadImage(tpl.image_url);
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = tpl.width_px;
  bgCanvas.height = tpl.height_px;
  const bctx = bgCanvas.getContext('2d')!;
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  bctx.drawImage(bgImg, 0, 0, bgCanvas.width, bgCanvas.height);
  const bgData = bgCanvas.toDataURL('image/jpeg', 0.92);

  const orientation = W >= H ? 'landscape' : 'portrait';
  const doc =
    layout === 'single'
      ? new jsPDF({ unit: 'mm', format: [W, H], orientation, compress: true })
      : new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

  // A4 grid geometry
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const gap = 8;
  const scale = layout === 'a4' ? Math.min(1, (pageW - 2 * margin) / W) : 1;
  const cw = W * scale;
  const ch = H * scale;
  const perPage = layout === 'a4' ? Math.max(1, Math.floor((pageH - 2 * margin + gap) / (ch + gap))) : 1;
  const x0 = (pageW - cw) / 2;

  const cutMarks = (x: number, y: number) => {
    doc.setDrawColor(120);
    doc.setLineWidth(0.15);
    const l = 4;
    const o = 1.5;
    for (const [cx, cy] of [[x, y], [x + cw, y], [x, y + ch], [x + cw, y + ch]]) {
      const dx = cx === x ? -1 : 1;
      const dy = cy === y ? -1 : 1;
      doc.line(cx + dx * o, cy, cx + dx * (o + l), cy);
      doc.line(cx, cy + dy * o, cx, cy + dy * (o + l));
    }
  };

  for (let i = 0; i < tickets.length; i++) {
    let ox = 0;
    let oy = 0;
    let s = 1;
    if (layout === 'single') {
      if (i > 0) doc.addPage([W, H], orientation);
    } else {
      const slot = i % perPage;
      if (i > 0 && slot === 0) doc.addPage('a4', 'portrait');
      const used = perPage * ch + (perPage - 1) * gap;
      ox = x0;
      oy = (pageH - used) / 2 + slot * (ch + gap);
      s = scale;
      cutMarks(ox, oy);
    }
    doc.addImage(bgData, 'JPEG', ox, oy, W * s, H * s, 'design-bg', 'FAST');
    for (const o of await renderOverlays(tpl, tickets[i], ctx)) {
      doc.addImage(o.canvas.toDataURL('image/png'), 'PNG', ox + o.x * mmPerPx * s, oy + o.y * mmPerPx * s, o.w * mmPerPx * s, o.h * mmPerPx * s, undefined, 'FAST');
    }
    if ((i + 1) % 5 === 0 || i === tickets.length - 1) {
      onProgress?.(i + 1, tickets.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return doc.output('blob');
}

/** Convert the first page of an uploaded PDF design into a high-resolution JPEG (in the browser). */
export async function pdfToImage(file: File): Promise<{ blob: Blob; widthMm: number }> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  // ~300 dpi for the real size, capped at 5000 px on the long side.
  const widthMm = (base.width * 25.4) / 72;
  const targetPx = Math.min(5000, Math.round((widthMm / 25.4) * 300));
  const viewport = page.getViewport({ scale: targetPx / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('render failed'))), 'image/jpeg', 0.92));
  await doc.destroy();
  return { blob, widthMm: Math.round(widthMm * 10) / 10 };
}
