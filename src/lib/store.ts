import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

export interface MapFilters {
  timeRange: 'today' | 'this_week' | 'this_month' | 'all_time';
  minRating: number;
  recipeOnly: boolean;
}

const defaultMapFilters: MapFilters = {
  timeRange: 'all_time',
  minRating: 0,
  recipeOnly: false,
};

interface AppState {
  user: User | null;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  mapFilters: MapFilters;
  mapCenter: [number, number] | null;
  mapZoom: number | null;
  setMapFilters: (filters: Partial<MapFilters>) => void;
  resetMapFilters: () => void;
  setMapPosition: (center: [number, number], zoom: number) => void;

  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;

  isCookieBannerVisible: boolean;
  isCookiePreferencesOpen: boolean;
  showCookieBanner: () => void;
  hideCookieBanner: () => void;
  openCookiePreferences: () => void;
  closeCookiePreferences: () => void;

  isWaitlistModalOpen: boolean;
  showWaitlistModal: () => void;
  hideWaitlistModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthModalOpen: false,
  setUser: (user) => set({ user }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),

  mapFilters: { ...defaultMapFilters },
  mapCenter: null,
  mapZoom: null,
  setMapFilters: (filters) =>
    set((state) => ({ mapFilters: { ...state.mapFilters, ...filters } })),
  resetMapFilters: () => set({ mapFilters: { ...defaultMapFilters } }),
  setMapPosition: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

  isCookieBannerVisible: false,
  isCookiePreferencesOpen: false,
  showCookieBanner: () => set({ isCookieBannerVisible: true }),
  hideCookieBanner: () =>
    set({ isCookieBannerVisible: false, isCookiePreferencesOpen: false }),
  openCookiePreferences: () => set({ isCookiePreferencesOpen: true }),
  closeCookiePreferences: () => set({ isCookiePreferencesOpen: false }),

  isWaitlistModalOpen: false,
  showWaitlistModal: () => set({ isWaitlistModalOpen: true }),
  hideWaitlistModal: () => set({ isWaitlistModalOpen: false }),
}));
