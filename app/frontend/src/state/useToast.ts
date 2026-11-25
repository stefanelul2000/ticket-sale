import { create } from 'zustand';

export type ToastTone = 'info' | 'ok' | 'warn' | 'danger';
type Toast = { id: number; message: string; tone: ToastTone };

type ToastState = {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

let seq = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { id, message, tone }] });
    setTimeout(() => get().dismiss(id), tone === 'danger' ? 7000 : 4500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, tone: ToastTone = 'info') => useToast.getState().push(message, tone);
