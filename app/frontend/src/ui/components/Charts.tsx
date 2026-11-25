import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useT } from '../../i18n';

/* Single-series column chart (time buckets). Marks: <=24px, 4px rounded data-end,
   square at the baseline, hairline grid, hover tooltip, optional table view. */

type Datum = { key: string; label: string; value: number; tooltip?: string };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver((entries) => setWidth(Math.max(240, Math.floor(entries[0].contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Axis max = 4 equal, round steps (1, 2, 5 × 10^k) so every tick is a clean integer. */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return step * 4;
}

export function ColumnChart({
  data,
  height = 220,
  ariaLabel,
  tableHeaders,
  emptyText,
}: {
  data: Datum[];
  height?: number;
  ariaLabel: string;
  tableHeaders: [string, string];
  emptyText: ReactNode;
}) {
  const t = useT();
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const padL = 34;
  const padR = 8;
  const padT = 18;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = useMemo(() => [0, 1, 2, 3, 4].map((i) => (max / 4) * i), [max]);

  if (!data.length) {
    return <div className="flex h-40 items-center justify-center rounded-lg bg-surface2 text-sm text-soft">{emptyText}</div>;
  }

  const band = innerW / data.length;
  const barW = Math.max(2, Math.min(24, band - 2));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 56))));

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-xs font-semibold text-accent hover:underline" onClick={() => setAsTable((v) => !v)}>
          {asTable ? t('chart.showChart') : t('chart.showTable')}
        </button>
      </div>
      {asTable ? (
        <div className="scroll-thin max-h-72 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface2 text-left text-xs uppercase text-soft">
              <tr>
                <th className="px-3 py-2">{tableHeaders[0]}</th>
                <th className="px-3 py-2 text-right">{tableHeaders[1]}</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((d) => (
                <tr key={d.key} className="border-t border-line">
                  <td className="px-3 py-1.5">{d.tooltip ?? d.label}</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
            {ticks.map((t) => {
              const y = padT + innerH - (t / max) * innerH;
              return (
                <g key={t}>
                  <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
                  <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--a-ink-soft)" className="tabular">
                    {t}
                  </text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const h = max > 0 ? (d.value / max) * innerH : 0;
              const x = padL + i * band + (band - barW) / 2;
              const y = padT + innerH - h;
              const r = Math.min(4, barW / 2, h);
              const path =
                h <= 0
                  ? ''
                  : `M${x},${padT + innerH} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${padT + innerH} Z`;
              return (
                <g key={d.key}>
                  {/* hit target: the whole band */}
                  <rect x={padL + i * band} y={padT} width={band} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
                  {path && <path d={path} fill="var(--chart-mark)" opacity={hover === null || hover === i ? 1 : 0.55} pointerEvents="none" />}
                  {i === peak && d.value > 0 && (
                    <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--a-ink)">
                      {d.value}
                    </text>
                  )}
                  {i % labelEvery === 0 && (
                    <text x={padL + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--a-ink-soft)">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop"
              style={{ left: Math.min(width - 60, Math.max(60, padL + hover * band + band / 2)), top: 0 }}
            >
              <div className="font-semibold text-ink">{data[hover].tooltip ?? data[hover].label}</div>
              <div className="text-soft">
                {tableHeaders[1]}: <span className="font-bold text-ink">{data[hover].value}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Part-of-whole rows: track = assigned (lighter step), fill = arrived (mark colour). */
export function ProgressRows({
  rows,
  legend,
  emptyText,
}: {
  rows: { key: string; label: ReactNode; value: number; total: number }[];
  legend: [string, string];
  emptyText: ReactNode;
}) {
  if (!rows.length) {
    return <div className="flex h-24 items-center justify-center rounded-lg bg-surface2 text-sm text-soft">{emptyText}</div>;
  }
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--chart-mark)' }} /> {legend[0]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--chart-track)' }} /> {legend[1]}
        </span>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} title={`${legend[0]}: ${r.value} / ${legend[1]}: ${r.total}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-ink">{r.label}</span>
              <span className="tabular shrink-0 text-soft">
                <span className="font-bold text-ink">{r.value}</span> / {r.total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ width: `${Math.max(4, (r.total / maxTotal) * 100)}%`, background: 'var(--chart-track)' }}>
              <div className={clsx('h-full rounded-full')} style={{ width: `${r.total ? (r.value / r.total) * 100 : 0}%`, background: 'var(--chart-mark)' }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
