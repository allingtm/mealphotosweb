'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);
  const setIsAdmin = useAppStore((s) => s.setIsAdmin);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAdminStatus(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      setIsAdmin(data?.is_admin ?? false);
    }

    // Hydrate the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        posthog.identify(session.user.id);
        fetchAdminStatus(session.user.id);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id);
        fetchAdminStatus(session.user.id);

        // Determine auth method from provider
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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setIsAdmin]);

  return <>{children}</>;
}
