import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  readonly id: string;
  readonly variant: ToastVariant;
  readonly title: string;
  readonly description?: string;
}

interface ToastStoreState {
  toasts: ToastItem[];
  modalDepth: number;
  show: (variant: ToastVariant, title: string, description?: string) => void;
  dismiss: (id: string) => void;
  enterModal: () => void;
  leaveModal: () => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 2800,
  info: 2600,
  warning: 3400,
  error: 3800,
};

export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],
  modalDepth: 0,

  show: (variant, title, description) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, variant, title, description }],
    }));

    setTimeout(() => {
      get().dismiss(id);
    }, DEFAULT_DURATION[variant]);
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  enterModal: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
  leaveModal: () =>
    set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
}));

/**
 * Helper ergonômico no padrão Sonner/HeroUI para disparar toasts em 1 linha.
 */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().show("success", title, description),
  error: (title: string, description?: string) =>
    useToastStore.getState().show("error", title, description),
  warning: (title: string, description?: string) =>
    useToastStore.getState().show("warning", title, description),
  info: (title: string, description?: string) =>
    useToastStore.getState().show("info", title, description),
};

