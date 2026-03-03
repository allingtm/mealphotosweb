import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthModalOpen: false,
  setUser: (user) => set({ user }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
