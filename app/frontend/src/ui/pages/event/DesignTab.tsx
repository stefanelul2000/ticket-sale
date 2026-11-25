import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import clsx from 'clsx';
import { useT } from '../../../i18n';
import type { TKey } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { pdfToImage } from '../../../lib/pdfExport';
import { canvasBlob, renderOverlays, renderTemplateCanvas } from '../../../lib/templateRender';
import type { TemplateContext } from '../../../lib/templateRender';
import type { PrintTicket } from '../../../lib/ticketPrint';
import { prepareFonts } from '../../../lib/ticketPrint';
import { useSettings } from '../../../state/useSettings';
import { toast } from '../../../state/useToast';
import type { EventT, PrintTemplate, TemplateElement, TemplateElementType } from '../../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Toggle } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { IconPlus } from '../../components/Icons';

const TYPES: TemplateElementType[] = ['qr', 'barcode', 'number', 'name', 'code'];

const defaults = (type: TemplateElementType, ratio: number): Omit<TemplateElement, 'id'> => {
  // ratio = height_px / width_px; QR boxes are square in pixels.
  if (type === 'qr') return { type, x: 0.45, y: 0.35, w: 0.18 * ratio, h: 0.18, background: 'white', qr_content: 'ticket' };
  if (type === 'barcode') return { type, x: 0.4, y: 0.4, w: 0.24, h: 0.1, background: 'white', show_text: true, color: '#000000' };
  if (type === 'number') return { type, x: 0.4, y: 0.2, w: 0.2, h: 0.07, prefix: '', digits: 3, color: '#000000', align: 'center', font: 'display', bold: true };
  if (type === 'name') return { type, x: 0.4, y: 0.3, w: 0.25, h: 0.07, color: '#000000', align: 'center', font: 'sans', bold: true };
  return { type, x: 0.4, y: 0.5, w: 0.2, h: 0.05, color: '#000000', align: 'center', font: 'mono', bold: true };
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number) => Math.round(v * 10000) / 10000;

export function DesignTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const { settings } = useSettings();
  const [tpl, setTpl] = useState<PrintTemplate | null>(event.print_template ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [fullPreview, setFullPreview] = useState<string | null>(null);
  const [sampleAssigned, setSampleAssigned] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTpl(event.print_template ?? null);
    setDirty(false);
  }, [event.print_template]);

  const ctx: TemplateContext = useMemo(
    () => ({ publicUrl: settings.public_url || window.location.origin, eventSlug: event.slug, photosUrl: event.photos_url }),
    [settings.public_url, event.slug, event.photos_url],
  );
  const sample: PrintTicket = useMemo(
    () => ({ ticket_code: 'K7M3P-9QXR2', ticket_number: 7, name: sampleAssigned ? t('print.sampleName') : null, ticket_type: event.ticket_types?.[0]?.name }),
    [sampleAssigned, t, event.ticket_types],
  );

  // Element previews rendered with the real renderer (WYSIWYG per element).
  useEffect(() => {
    if (!tpl) return undefined;
    let alive = true;
    const id = setTimeout(async () => {
      await prepareFonts();
      const map: Record<string, string> = {};
      for (const el of tpl.elements) {
        const [o] = await renderOverlays({ ...tpl, elements: [el] }, sample, ctx);
        if (o) map[el.id] = o.canvas.toDataURL('image/png');
      }
      if (alive) setPreviews(map);
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [tpl, sample, ctx]);

  const update = useCallback((id: string, patch: Partial<TemplateElement>) => {
    setTpl((cur) => (cur ? { ...cur, elements: cur.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : cur));
    setDirty(true);
  }, []);

  const add = (type: TemplateElementType) => {
    if (!tpl) return;
    const el = { id: `${type}-${Date.now().toString(36)}`, ...defaults(type, tpl.height_px / tpl.width_px) } as TemplateElement;
    setTpl({ ...tpl, elements: [...tpl.elements, el] });
    setSelected(el.id);
    setDirty(true);
  };

  const remove = (id: string) => {
    if (!tpl) return;
    setTpl({ ...tpl, elements: tpl.elements.filter((e) => e.id !== id) });
    setSelected(null);
    setDirty(true);
  };

  // ---- drag / resize (pointer events, relative coordinates) ----
  const startDrag = (e: ReactPointerEvent, el: TemplateElement, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(el.id);
    const rect = stageRef.current!.getBoundingClientRect();
    const start = { px: e.clientX, py: e.clientY, x: el.x, y: el.y, w: el.w, h: el.h };
    const ratio = tpl ? tpl.width_px / tpl.height_px : 1;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.px) / rect.width;
      const dy = (ev.clientY - start.py) / rect.height;
      if (mode === 'move') {
        update(el.id, { x: round(clamp(start.x + dx, 0, 1 - start.w)), y: round(clamp(start.y + dy, 0, 1 - start.h)) });
      } else {
        let w = clamp(start.w + dx, 0.01, 1 - start.x);
        let h = clamp(start.h + dy, 0.01, 1 - start.y);
        if (el.type === 'qr') {
          // keep square in real pixels
          h = clamp(w * ratio, 0.01, 1 - start.y);
          w = h / ratio;
        }
        update(el.id, { w: round(w), h: round(h) });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!tpl || !selected) return;
    const el = tpl.elements.find((x) => x.id === selected);
    if (!el) return;
    const step = e.shiftKey ? 0.01 : 0.002;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update(el.id, { x: round(clamp(el.x + dx, 0, 1 - el.w)), y: round(clamp(el.y + dy, 0, 1 - el.h)) });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(el.id);
    }
  };

  // ---- upload / save ----
  const upload = async (file: File) => {
    setBusy('upload');
    try {
      let blob: Blob = file;
      let name = file.name;
      let widthMm: number | null = null;
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const res = await pdfToImage(file);
        blob = res.blob;
        name = 'design.jpg';
        widthMm = res.widthMm;
      }
      let saved: PrintTemplate = await api.uploadTemplate(event.id, blob, name);
      if (widthMm) saved = await api.saveTemplate(event.id, { width_mm: widthMm, elements: saved.elements });
      setTpl(saved);
      setDirty(false);
      toast(t('design.uploaded'), 'ok');
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('design.uploadFailed')), 'danger');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!tpl) return;
    setBusy('save');
    try {
      const saved = await api.saveTemplate(event.id, { width_mm: tpl.width_mm, elements: tpl.elements });
      setTpl(saved);
      setDirty(false);
      toast(t('common.saved'), 'ok');
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const removeDesign = async () => {
    if (!window.confirm(t('design.removeConfirm'))) return;
    setBusy('remove');
    try {
      await api.deleteTemplate(event.id);
      setTpl(null);
      setSelected(null);
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const showPreview = async () => {
    if (!tpl) return;
    setBusy('preview');
    try {
      await prepareFonts();
      const canvas = await renderTemplateCanvas(tpl, sample, ctx);
      setFullPreview(URL.createObjectURL(await canvasBlob(canvas, 'image/jpeg', 0.9)));
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setBusy(null);
    }
  };

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/pdf,image/png,image/jpeg,image/webp,.pdf"
      className="hidden"
      onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
    />
  );

  if (!tpl) {
    return (
      <Card title={t('design.title')} subtitle={t('design.intro')}>
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-linestrong bg-surface2 px-6 py-14 text-center hover:border-accent"
        >
          {busy === 'upload' ? <Spinner size="lg" /> : <IconPlus size={28} />}
          <span className="font-semibold">{t('design.uploadCta')}</span>
          <span className="text-sm text-soft">{t('design.uploadHint')}</span>
        </button>
      </Card>
    );
  }

  const sel = tpl.elements.find((e) => e.id === selected) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card
        title={t('design.title')}
        subtitle={t('design.editorHint')}
        actions={
          <>
            {dirty && <span className="text-sm font-semibold text-warn">{t('design.unsaved')}</span>}
            <Button variant="secondary" size="sm" onClick={showPreview} loading={busy === 'preview'}>{t('design.preview')}</Button>
            <Button size="sm" onClick={save} loading={busy === 'save'} disabled={!dirty}>{t('common.save')}</Button>
          </>
        }
      >
        {fileInput}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-soft">{t('design.add')}:</span>
          {TYPES.map((ty) => (
            <Button key={ty} size="sm" variant="secondary" onClick={() => add(ty)}>
              <IconPlus size={14} /> {t(`design.el.${ty}` as TKey)}
            </Button>
          ))}
        </div>
        <div
          ref={stageRef}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={() => setSelected(null)}
          className="relative w-full select-none overflow-hidden rounded-lg border border-line bg-surface2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ aspectRatio: `${tpl.width_px} / ${tpl.height_px}`, touchAction: 'none' }}
        >
          <img src={tpl.image_url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />
          {tpl.elements.map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => startDrag(e, el, 'move')}
              className={clsx(
                'absolute cursor-move',
                selected === el.id ? 'outline outline-2 outline-accent' : 'outline-dashed outline-1 outline-sky hover:outline-2',
              )}
              style={{ left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, height: `${el.h * 100}%` }}
              title={t(`design.el.${el.type}` as TKey)}
            >
              {previews[el.id] ? (
                <img src={previews[el.id]} alt="" draggable={false} className="pointer-events-none h-full w-full" />
              ) : (
                <span className="pointer-events-none flex h-full w-full items-center justify-center bg-white/60 text-[10px] font-bold text-navy">{t(`design.el.${el.type}` as TKey)}</span>
              )}
              {selected === el.id && (
                <span
                  onPointerDown={(e) => startDrag(e, el, 'resize')}
                  className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border-2 border-white bg-accent"
                  aria-label={t('design.resize')}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-soft">
          <span>{t('design.keys')}</span>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sampleAssigned} onChange={(e) => setSampleAssigned(e.target.checked)} />
            {t('design.sampleWithName')}
          </label>
        </div>
      </Card>

      <div className="space-y-6">
        {sel ? (
          <ElementPanel el={sel} event={event} onChange={(p) => update(sel.id, p)} onRemove={() => remove(sel.id)} />
        ) : (
          <Card title={t('design.elements')}>
            {tpl.elements.length === 0 ? (
              <p className="text-sm text-soft">{t('design.noElements')}</p>
            ) : (
              <ul className="space-y-1">
                {tpl.elements.map((el) => (
                  <li key={el.id}>
                    <button type="button" onClick={() => setSelected(el.id)} className="w-full rounded px-2 py-1.5 text-left text-sm font-semibold hover:bg-surface2">
                      {t(`design.el.${el.type}` as TKey)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!tpl.elements.some((e) => e.type === 'qr' || e.type === 'barcode') && <p className="mt-3 text-sm font-semibold text-warn">{t('design.needCode')}</p>}
          </Card>
        )}
        <Card title={t('design.document')}>
          <div className="space-y-4">
            <Input
              label={t('design.widthMm')}
              type="number"
              min={30}
              max={600}
              step="0.1"
              value={tpl.width_mm}
              onChange={(e) => {
                setTpl({ ...tpl, width_mm: Number(e.target.value) || tpl.width_mm });
                setDirty(true);
              }}
              hint={t('design.widthHint', { h: Math.round(((tpl.width_mm * tpl.height_px) / tpl.width_px) * 10) / 10, px: `${tpl.width_px}×${tpl.height_px}` })}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={busy === 'upload'}>{t('design.replace')}</Button>
              <Button variant="danger" size="sm" onClick={removeDesign} loading={busy === 'remove'}>{t('design.remove')}</Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={!!fullPreview}
        wide
        title={t('design.preview')}
        onClose={() => {
          if (fullPreview) URL.revokeObjectURL(fullPreview);
          setFullPreview(null);
        }}
      >
        {fullPreview && <img src={fullPreview} alt={t('design.preview')} className="w-full rounded border border-line" />}
      </Modal>
    </div>
  );
}

function ElementPanel({ el, event, onChange, onRemove }: { el: TemplateElement; event: EventT; onChange: (p: Partial<TemplateElement>) => void; onRemove: () => void }) {
  const t = useT();
  const isText = el.type === 'number' || el.type === 'name' || el.type === 'code';
  return (
    <Card title={t(`design.el.${el.type}` as TKey)} subtitle={t(`design.el.${el.type}.hint` as TKey)}>
      <div className="space-y-4">
        {el.type === 'qr' && (
          <>
            <Select label={t('design.qrContent')} value={el.qr_content ?? 'ticket'} onChange={(e) => onChange({ qr_content: e.target.value as TemplateElement['qr_content'] })}>
              <option value="ticket">{t('design.qr.ticket')}</option>
              <option value="photos">{t('design.qr.photos')}</option>
              <option value="event">{t('design.qr.event')}</option>
            </Select>
            <p className="text-xs text-soft">{t(`design.qr.${el.qr_content ?? 'ticket'}.hint` as TKey)}</p>
            {el.qr_content === 'photos' && !event.photos_url && <p className="text-xs font-semibold text-warn">{t('design.qr.photosMissing')}</p>}
          </>
        )}
        {el.type === 'barcode' && <Toggle checked={el.show_text ?? true} onChange={(v) => onChange({ show_text: v })} label={t('design.showCode')} />}
        {(el.type === 'number' || el.type === 'code') && (
          <Input label={t('design.prefix')} value={el.prefix ?? ''} maxLength={40} onChange={(e) => onChange({ prefix: e.target.value })} placeholder={el.type === 'number' ? 'Nr. ' : ''} />
        )}
        {el.type === 'number' && (
          <Select label={t('design.digits')} value={String(el.digits ?? 3)} onChange={(e) => onChange({ digits: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {'7'.padStart(d, '0')}
              </option>
            ))}
          </Select>
        )}
        {isText && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Select label={t('design.font')} value={el.font ?? 'sans'} onChange={(e) => onChange({ font: e.target.value as TemplateElement['font'] })}>
                <option value="sans">Manrope</option>
                <option value="display">Bricolage</option>
                <option value="mono">Mono</option>
              </Select>
              <Select label={t('design.align')} value={el.align ?? 'left'} onChange={(e) => onChange({ align: e.target.value as TemplateElement['align'] })}>
                <option value="left">{t('design.align.left')}</option>
                <option value="center">{t('design.align.center')}</option>
                <option value="right">{t('design.align.right')}</option>
              </Select>
            </div>
            <Toggle checked={!!el.bold} onChange={(v) => onChange({ bold: v })} label={t('design.bold')} />
            <Toggle checked={!!el.uppercase} onChange={(v) => onChange({ uppercase: v })} label={t('design.uppercase')} />
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="block text-sm font-semibold">{t('design.color')}</span>
            <input type="color" value={el.color ?? '#000000'} onChange={(e) => onChange({ color: e.target.value })} className="h-10 w-full cursor-pointer rounded border border-linestrong bg-surface" />
          </label>
          <Select label={t('design.background')} value={el.background ?? (isText ? 'none' : 'white')} onChange={(e) => onChange({ background: e.target.value as TemplateElement['background'] })}>
            <option value="none">{t('design.bg.none')}</option>
            <option value="white">{t('design.bg.white')}</option>
          </Select>
        </div>
        {!isText && el.background === 'none' && <p className="text-xs font-semibold text-warn">{t('design.bgWarn')}</p>}
        <Button variant="danger" size="sm" onClick={onRemove}>{t('common.delete')}</Button>
      </div>
    </Card>
  );
}
