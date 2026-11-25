import type { TKey } from '../i18n';

export const GUEST_CATEGORIES = ['parent', 'family', 'friend', 'guest', 'partner', 'press', 'other'] as const;
export type GuestCategory = (typeof GUEST_CATEGORIES)[number];

export const categoryKey = (c?: string | null): TKey =>
  (c && (GUEST_CATEGORIES as readonly string[]).includes(c) ? `cat.${c}` : 'cat.none') as TKey;

export const ROLE_IDS = [1, 2, 3, 4, 5, 6] as const;
export const roleKey = (id: number): TKey => (`role.${id}` as TKey);
export const roleDescKey = (id: number): TKey => (`role.${id}.desc` as TKey);
