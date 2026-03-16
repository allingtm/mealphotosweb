'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);
  const setIsAdmin = useAppStore((s) => s.setIsAdmin);
  const setIsBusiness = useAppStore((s) => s.setIsBusiness);
  const setUserPlan = useAppStore((s) => s.setUserPlan);
  const setProfileAvatarUrl = useAppStore((s) => s.setProfileAvatarUrl);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfileFlags(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, is_business, plan, avatar_url')
        .eq('id', userId)
        .single();
      setIsAdmin(data?.is_admin ?? false);
      setIsBusiness(data?.is_business ?? false);
      setUserPlan((data?.plan as 'free' | 'business') ?? 'free');
      setProfileAvatarUrl(data?.avatar_url ?? null);
    }

    // Hydrate the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        posthog.identify(session.user.id);
        fetchProfileFlags(session.user.id);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id);
        fetchProfileFlags(session.user.id);

        const provider = session.user.app_metadata?.provider;
        const method =
          provider === 'google'
            ? 'google'
            : provider === 'apple'
              ? 'apple'
              : 'email';

        posthog.capture(ANALYTICS_EVENTS.AUTH_COMPLETED, { method });
      }

      if (event === 'SIGNED_OUT') {
        posthog.reset();
        setIsAdmin(false);
        setIsBusiness(false);
        setUserPlan('free');
        setProfileAvatarUrl(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setIsAdmin, setIsBusiness, setUserPlan, setProfileAvatarUrl]);

  return <>{children}</>;
}
