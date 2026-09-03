import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
  /** Optional retry action for transient errors (network, rate limit) */
  action?: { label: string; onClick: () => void };
}

interface UIStore {
  slipOpen: boolean;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  activeModal: string | null;
  modalData: unknown;
  toasts: Toast[];
  isMobile: boolean;
  toggleSlip: (v?: boolean) => void;
  toggleSidebar: (v?: boolean) => void;
  toggleCommandPalette: (v?: boolean) => void;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  setMobile: (v: boolean) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIStore>((set) => ({
  slipOpen: false,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  activeModal: null,
  modalData: null,
  toasts: [],
  isMobile: false,
  toggleSlip: (v) => set((s) => ({ slipOpen: v !== undefined ? v : !s.slipOpen })),
  toggleSidebar: (v) =>
    set((s) => ({ sidebarCollapsed: v !== undefined ? v : !s.sidebarCollapsed })),
  toggleCommandPalette: (v) =>
    set((s) => ({
      commandPaletteOpen: v !== undefined ? v : !s.commandPaletteOpen,
    })),
  openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: `toast-${++toastCounter}` }],
    })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setMobile: (isMobile) => set({ isMobile }),
}));
