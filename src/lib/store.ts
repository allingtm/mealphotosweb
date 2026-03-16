import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { BusinessType, BusinessTypeGroup } from '@/types/database';

export type FeedTab = 'following' | 'nearby' | 'trending';

interface AppState {
  // Auth
  user: User | null;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;

  // User profile state
  isBusiness: boolean;
  setIsBusiness: (isBusiness: boolean) => void;
  userPlan: 'free' | 'business';
  setUserPlan: (plan: 'free' | 'business') => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  profileAvatarUrl: string | null;
  setProfileAvatarUrl: (url: string | null) => void;

  // Feed
  feedTab: FeedTab;
  setFeedTab: (tab: FeedTab) => void;

  // Map
  mapTypeFilter: BusinessType | BusinessTypeGroup | 'all';
  mapCenter: [number, number] | null;
  mapZoom: number | null;
  setMapTypeFilter: (filter: BusinessType | BusinessTypeGroup | 'all') => void;
  setMapPosition: (center: [number, number], zoom: number) => void;

  // Cookie consent
  isCookieBannerVisible: boolean;
  isCookiePreferencesOpen: boolean;
  showCookieBanner: () => void;
  hideCookieBanner: () => void;
  openCookiePreferences: () => void;
  closeCookiePreferences: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthModalOpen: false,
  setUser: (user) => set({ user }),
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  isBusiness: false,
  setIsBusiness: (isBusiness) => set({ isBusiness }),
  userPlan: 'free',
  setUserPlan: (plan) => set({ userPlan: plan }),
  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  profileAvatarUrl: null,
  setProfileAvatarUrl: (url) => set({ profileAvatarUrl: url }),

  feedTab: 'nearby',
  setFeedTab: (tab) => set({ feedTab: tab }),

  mapTypeFilter: 'all',
  mapCenter: null,
  mapZoom: null,
  setMapTypeFilter: (filter) => set({ mapTypeFilter: filter }),
  setMapPosition: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

  isCookieBannerVisible: false,
  isCookiePreferencesOpen: false,
  showCookieBanner: () => set({ isCookieBannerVisible: true }),
  hideCookieBanner: () =>
    set({ isCookieBannerVisible: false, isCookiePreferencesOpen: false }),
  openCookiePreferences: () => set({ isCookiePreferencesOpen: true }),
  closeCookiePreferences: () => set({ isCookiePreferencesOpen: false }),
}));
