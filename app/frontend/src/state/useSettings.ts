import { create } from 'zustand';
import { api } from '../lib/api';

export type PublicSettings = {
  name: string;
  website_url: string;
  donation_url: string;
  public_url: string;
  registration_enabled: boolean;
};

const fallback: PublicSettings = {
  name: 'Asociația Atelier Săcelean',
  website_url: 'https://atelier-sacelean.ro',
  donation_url: 'https://atelier-sacelean.ro/donate',
  public_url: window.location.origin,
  registration_enabled: false,
};

type SettingsState = { settings: PublicSettings; loaded: boolean; load: () => Promise<void>; set: (s: Partial<PublicSettings>) => void };

export const useSettings = create<SettingsState>((set, get) => ({
  settings: fallback,
  loaded: false,
  load: async () => {
    try {
      const s = await api.publicSettings();
      set({ settings: { ...fallback, ...s, public_url: s.public_url || fallback.public_url }, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  set: (s) => set({ settings: { ...get().settings, ...s } }),
}));
