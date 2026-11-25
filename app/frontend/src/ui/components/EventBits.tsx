import clsx from 'clsx';
import { useT } from '../../i18n';
import { eventPhase } from '../../lib/format';
import { GUEST_CATEGORIES, categoryKey } from '../../lib/constants';
import { Badge } from './ui/Badge';

export function PhaseBadge({ startsAt, endsAt }: { startsAt?: string | null; endsAt?: string | null }) {
  const t = useT();
  const phase = eventPhase(startsAt, endsAt);
  const tone = phase === 'today' ? 'ok' : phase === 'upcoming' ? 'accent' : 'neutral';
  return <Badge tone={tone}>{t(`phase.${phase}` as const)}</Badge>;
}

/** Optional guest category as quick chips (one tap on phones). */
export function CategoryChips({ value, onChange, className }: { value: string | null; onChange: (v: string | null) => void; className?: string }) {
  const t = useT();
  return (
    <div className={clsx('flex flex-wrap gap-2', className)} role="radiogroup" aria-label={t('field.category')}>
      {GUEST_CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => onChange(value === c ? null : c)}
          className={clsx(
            'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
            value === c ? 'border-accent bg-accent text-onaccent' : 'border-linestrong bg-surface text-soft hover:text-ink',
          )}
        >
          {t(categoryKey(c))}
        </button>
      ))}
    </div>
  );
}

export function CategorySelect({ value, onChange, includeAll, id }: { value: string; onChange: (v: string) => void; includeAll?: boolean; id?: string }) {
  const t = useT();
  return (
    <select
      id={id}
      className="select h-10 w-full rounded border border-linestrong bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {includeAll ? <option value="">{t('filter.allCategories')}</option> : <option value="">{t('cat.none')}</option>}
      {GUEST_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {t(categoryKey(c))}
        </option>
      ))}
      {includeAll && <option value="none">{t('cat.none')}</option>}
    </select>
  );
}
