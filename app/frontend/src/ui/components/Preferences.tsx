import clsx from 'clsx';
import { useI18n, useT } from '../../i18n';
import { useTheme } from '../../state/useTheme';
import { IconMoon, IconSun } from './Icons';

/** RO/EN switch + light/dark switch. */
export function Preferences({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const { mode, toggle } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded border border-linestrong p-0.5" role="group" aria-label={t('pref.language')}>
        {(['ro', 'en'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={clsx('rounded-[7px] px-2 py-1 text-xs font-bold uppercase', lang === l ? 'bg-accent text-onaccent' : 'text-soft hover:text-ink')}
          >
            {l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-linestrong text-soft hover:text-ink"
        aria-label={mode === 'dark' ? t('pref.light') : t('pref.dark')}
        title={mode === 'dark' ? t('pref.light') : t('pref.dark')}
      >
        {mode === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </button>
      {!compact && null}
    </div>
  );
}
