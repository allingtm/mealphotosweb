import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { BusinessType, BusinessTypeGroup, BusinessPremise } from '@/types/database';
import type { TeamPermissions } from '@/lib/team';

export type FeedTab = 'following' | 'nearby' | 'trending';

interface AppState {
  // Auth
  user: User | null;
  isAuthModalOpen: boolean;
  authModalMode: 'signup' | 'signin';
  setUser: (user: User | null) => void;
  openAuthModal: (mode?: 'signup' | 'signin') => void;
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

  // Team context (for team members acting on behalf of a business)
  teamBusinessId: string | null;
  teamRole: 'owner' | 'member' | null;
  teamPermissions: TeamPermissions | null;
  setTeamContext: (businessId: string | null, role: 'owner' | 'member' | null, permissions: TeamPermissions | null) => void;

  // Feed
  feedTab: FeedTab;
  setFeedTab: (tab: FeedTab) => void;

  // Premises
  premises: BusinessPremise[];
  activePremiseId: string | null;
  setPremises: (premises: BusinessPremise[]) => void;
  setActivePremiseId: (id: string | null) => void;

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
  authModalMode: 'signin',
  setUser: (user) => set({ user }),
  openAuthModal: (mode) => set({ isAuthModalOpen: true, authModalMode: mode ?? 'signin' }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  isBusiness: false,
  setIsBusiness: (isBusiness) => set({ isBusiness }),
  userPlan: 'free',
  setUserPlan: (plan) => set({ userPlan: plan }),
  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  profileAvatarUrl: null,
  setProfileAvatarUrl: (url) => set({ profileAvatarUrl: url }),

  teamBusinessId: null,
  teamRole: null,
  teamPermissions: null,
  setTeamContext: (businessId, role, permissions) => set({ teamBusinessId: businessId, teamRole: role, teamPermissions: permissions }),

  premises: [],
  activePremiseId: null,
  setPremises: (premises) => set({ premises }),
  setActivePremiseId: (id) => set({ activePremiseId: id }),

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
