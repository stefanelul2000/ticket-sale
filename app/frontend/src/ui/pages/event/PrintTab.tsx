import { useEffect, useMemo, useState } from 'react';
import { useT, translate } from '../../../i18n';
import type { TKey } from '../../../i18n';
import { api, errorMessage } from '../../../lib/api';
import { GUEST_CATEGORIES, categoryKey } from '../../../lib/constants';
import { fmtNumber, fmtTime, fmtWeekdayDate } from '../../../lib/format';
import { ticketUrl } from '../../../lib/ticketCode';
import { csvBlob, downloadBlob, prepareFonts, renderTicketImages, safeFileName } from '../../../lib/ticketPrint';
import type { PrintContext, PrintTicket } from '../../../lib/ticketPrint';
import { useSettings } from '../../../state/useSettings';
import { toast } from '../../../state/useToast';
import type { EventT } from '../../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { IconDownload } from '../../components/Icons';

type ExportTicket = PrintTicket & { guest_category?: string | null; checkin?: boolean };

/** "Maria Pop; familie" / "Maria Pop<TAB>family" -> entry. Category accepts RO/EN labels or keys. */
function parseGuestList(text: string) {
  const lookup = new Map<string, string>();
  for (const c of GUEST_CATEGORIES) {
    lookup.set(c, c);
    lookup.set(translate('ro', `cat.${c}` as TKey).toLowerCase(), c);
    lookup.set(translate('en', `cat.${c}` as TKey).toLowerCase(), c);
  }
  const entries: { name: string; guest_category: string | null }[] = [];
  const unknown = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let namePart = line;
    let catPart: string | undefined;
    const sep = line.search(/[;\t]/);
    if (sep >= 0) {
      namePart = line.slice(0, sep).trim();
      catPart = line.slice(sep + 1).trim() || undefined;
    } else {
      // "Name, category" only when the part after the last comma is a known category.
      const comma = line.lastIndexOf(',');
      const tail = comma >= 0 ? line.slice(comma + 1).trim().toLowerCase() : '';
      if (tail && lookup.has(tail)) {
        namePart = line.slice(0, comma).trim();
        catPart = tail;
      }
    }
    if (!namePart) continue;
    let cat: string | null = null;
    if (catPart) {
      cat = lookup.get(catPart.toLowerCase()) ?? null;
      if (!cat) unknown.add(catPart);
    }
    entries.push({ name: namePart.slice(0, 255), guest_category: cat });
  }
  return { entries, unknown: [...unknown] };
}

export function PrintTab({ event, onChanged }: { event: EventT; onChanged: () => void }) {
  const t = useT();
  const { settings, load: loadSettings, loaded } = useSettings();
  const types = event.ticket_types ?? [];
  const [typeId, setTypeId] = useState<number>(types[0]?.id ?? 0);
  const [count, setCount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [list, setList] = useState('');
  const [generateMissing, setGenerateMissing] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<ExportTicket[] | null>(null);
  const [scope, setScope] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) loadSettings();
  }, [loaded, loadSettings]);

  useEffect(() => {
    if (!typeId && types[0]) setTypeId(types[0].id);
  }, [types, typeId]);

  const parsed = useMemo(() => parseGuestList(list), [list]);
  const generated = event.tickets_generated ?? 0;
  const remaining = event.capacity ? Math.max(0, event.capacity - generated) : null;

  const printContext = (): PrintContext => ({
    eventName: event.name,
    dateLine: [event.starts_at ? `${fmtWeekdayDate(event.starts_at)}, ${fmtTime(event.starts_at)}` : '', event.venue ?? ''].filter(Boolean).join(' · '),
    publicUrl: settings.public_url || window.location.origin,
    orgName: settings.name,
    labels: { guest: t('print.guestLabel'), scanHint: t('print.scanHint') },
    pad: Math.max(3, String(Math.max(1, generated)).length),
  });

  // Live preview of the card design (first ticket, or a sample).
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    (async () => {
      await prepareFonts();
      const sample: ExportTicket = { ticket_code: 'K7M3P-9QXR2', ticket_number: 1, name: t('print.sampleName'), ticket_type: types[0]?.name };
      const imgs = await renderTicketImages(sample, printContext());
      if (!alive) return;
      url = URL.createObjectURL(imgs.combined);
      setPreview(url);
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [event.id, event.name, event.starts_at, event.venue, settings.public_url, settings.name, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const doGenerate = async () => {
    const n = Number(count);
    if (!typeId || !n) return;
    setGenerating(true);
    try {
      const res = await api.generate({ event_id: event.id, ticket_type_id: typeId, count: n });
      toast(t('print.generated', { n: res.generated, from: res.start, to: res.end }), 'ok');
      setCount('');
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setGenerating(false);
    }
  };

  const doImport = async () => {
    if (!typeId || !parsed.entries.length) return;
    setImporting(true);
    try {
      const res = await api.assignList(event.id, { ticket_type_id: typeId, generate_missing: generateMissing, entries: parsed.entries });
      const typeName = types.find((x) => x.id === typeId)?.name;
      setLastImport(res.tickets.map((x: ExportTicket) => ({ ...x, ticket_type: typeName, sold: true })));
      toast(t('print.imported', { n: res.assigned }), 'ok');
      setList('');
      onChanged();
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setImporting(false);
    }
  };

  const fetchTickets = async (): Promise<ExportTicket[]> => {
    const res = await api.eventTickets(event.id);
    const all: ExportTicket[] = res.tickets;
    return scope === 'all' ? all : scope === 'assigned' ? all.filter((x) => x.sold) : all.filter((x) => !x.sold);
  };

  const csvFor = (tickets: ExportTicket[], ctx: PrintContext, pad: number) =>
    csvBlob([
      [t('field.number'), t('field.ticketCode'), t('field.guestName'), t('field.category'), t('field.ticketType'), 'qr_url', 'image'],
      ...tickets.map((x) => [
        String(x.ticket_number).padStart(pad, '0'),
        x.ticket_code,
        x.name ?? '',
        x.guest_category ? t(categoryKey(x.guest_category)) : '',
        x.ticket_type ?? '',
        ticketUrl(ctx.publicUrl, x.ticket_code),
        `${String(x.ticket_number).padStart(pad, '0')}_${x.ticket_code}.png`,
      ]),
    ]);

  const downloadZip = async (given?: ExportTicket[]) => {
    try {
      const tickets = given ?? (await fetchTickets());
      if (!tickets.length) {
        toast(t('print.nothing'), 'warn');
        return;
      }
      setProgress({ done: 0, total: tickets.length });
      await prepareFonts();
      const JSZip = ((await import('jszip')) as unknown as { default: typeof import('jszip') }).default;
      const zip = new JSZip();
      const ctx = printContext();
      const pad = ctx.pad;
      let done = 0;
      for (const x of tickets) {
        const base = `${String(x.ticket_number).padStart(pad, '0')}_${x.ticket_code}`;
        const imgs = await renderTicketImages(x, ctx);
        zip.file(`${t('print.folderCards')}/${base}.png`, imgs.combined);
        zip.file(`qr/${base}.png`, imgs.qr);
        zip.file(`code128/${base}.png`, imgs.code128);
        done += 1;
        if (done % 10 === 0 || done === tickets.length) {
          setProgress({ done, total: tickets.length });
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      zip.file('invitatii.csv', csvFor(tickets, ctx, pad));
      zip.file(
        'CITESTE.txt',
        [
          `${event.name} — ${tickets.length}`,
          '',
          t('print.readme1'),
          t('print.readme2'),
          t('print.readme3'),
          t('print.readme4'),
          '',
          t('print.readme5'),
        ].join('\r\n'),
      );
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      downloadBlob(blob, `${safeFileName(event.name)}-invitatii.zip`);
      toast(t('print.zipDone', { n: tickets.length }), 'ok');
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    } finally {
      setProgress(null);
    }
  };

  const downloadCsv = async () => {
    try {
      const tickets = await fetchTickets();
      const ctx = printContext();
      downloadBlob(csvFor(tickets, ctx, ctx.pad), `${safeFileName(event.name)}-invitatii.csv`);
    } catch (err) {
      toast(errorMessage(err, t('common.error')), 'danger');
    }
  };

  const typeSelect = (
    <Select label={t('field.ticketType')} value={typeId || ''} onChange={(e) => setTypeId(Number(e.target.value))}>
      {types.map((ty) => (
        <option key={ty.id} value={ty.id}>
          {ty.name}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <Card title={t('print.generateTitle')} subtitle={t('print.generateHint')}>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            {typeSelect}
            <Input label={t('field.count')} type="number" min={1} max={5000} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-soft">
              {t('print.generatedSoFar', { n: fmtNumber(generated) })}
              {remaining !== null ? ` · ${t('print.remaining', { n: fmtNumber(remaining) })}` : ''}
            </span>
            <Button onClick={doGenerate} loading={generating} disabled={!Number(count) || !typeId}>
              {t('print.generate')}
            </Button>
          </div>
        </Card>

        <Card title={t('print.importTitle')} subtitle={t('print.importHint')}>
          <div className="space-y-4">
            {typeSelect}
            <Textarea
              label={t('print.importLabel')}
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder={t('print.importPlaceholder')}
              className="min-h-[160px] font-mono text-sm"
              hint={t('print.importFormat')}
            />
            {parsed.unknown.length > 0 && <p className="text-sm font-semibold text-warn">{t('print.unknownCategories', { list: parsed.unknown.join(', ') })}</p>}
            <Toggle checked={generateMissing} onChange={setGenerateMissing} label={t('print.generateMissing')} hint={t('print.generateMissingHint')} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-soft">{t('print.importCount', { n: parsed.entries.length })}</span>
              <Button onClick={doImport} loading={importing} disabled={!parsed.entries.length || !typeId}>
                {t('print.importSubmit')}
              </Button>
            </div>
            {lastImport && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-okbg p-3 text-sm text-ok">
                <span className="font-semibold">{t('print.importedReady', { n: lastImport.length })}</span>
                <Button size="sm" variant="success" onClick={() => downloadZip(lastImport)} loading={!!progress}>
                  <IconDownload size={16} /> {t('print.downloadThese')}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title={t('print.downloadTitle')} subtitle={t('print.downloadHint')}>
        {preview && <img src={preview} alt={t('print.preview')} className="mb-4 w-full rounded-lg border border-line" />}
        <Select label={t('print.scope')} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
          <option value="all">{t('print.scopeAll')}</option>
          <option value="unassigned">{t('print.scopeUnassigned')}</option>
          <option value="assigned">{t('print.scopeAssigned')}</option>
        </Select>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => downloadZip()} loading={!!progress}>
            <IconDownload size={16} /> {t('print.zip')}
          </Button>
          <Button variant="secondary" onClick={downloadCsv}>
            <IconDownload size={16} /> CSV
          </Button>
        </div>
        {progress && (
          <p className="mt-3 text-sm text-soft">
            {t('print.rendering', { done: progress.done, total: progress.total })}
          </p>
        )}
        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-soft">
          <li>{t('print.note1')}</li>
          <li>{t('print.note2', { url: (settings.public_url || window.location.origin).replace(/^https?:\/\//, '') })}</li>
          <li>{t('print.note3')}</li>
        </ul>
      </Card>
    </div>
  );
}
