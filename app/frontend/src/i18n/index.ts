import { useCallback } from 'react';
import { create } from 'zustand';
import { ro } from './ro';
import { en } from './en';

export type Lang = 'ro' | 'en';
export type TKey = keyof typeof ro;
type Vars = Record<string, string | number | null | undefined>;

const dicts: Record<Lang, Record<TKey, string>> = { ro, en };

const initialLang = (): Lang => {
  try {
    const stored = localStorage.getItem('ts_lang');
    if (stored === 'ro' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return 'ro';
};

type I18nState = { lang: Lang; setLang: (lang: Lang) => void };

export const useI18n = create<I18nState>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try {
      localStorage.setItem('ts_lang', lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

export function translate(lang: Lang, key: TKey, vars?: Vars): string {
  let text = dicts[lang][key] ?? dicts.ro[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(value === null || value === undefined ? '' : String(value));
    }
  }
  return text;
}

/** Non-React access (API client, helpers). */
export const t = (key: TKey, vars?: Vars) => translate(useI18n.getState().lang, key, vars);

export function useT() {
  const lang = useI18n((s) => s.lang);
  return useCallback((key: TKey, vars?: Vars) => translate(lang, key, vars), [lang]);
}

export const localeTag = (lang: Lang) => (lang === 'ro' ? 'ro-RO' : 'en-GB');
