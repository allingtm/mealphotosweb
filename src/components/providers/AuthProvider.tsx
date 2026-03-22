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
  const setTeamContext = useAppStore((s) => s.setTeamContext);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfileFlags(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, is_business, plan, avatar_url')
        .eq('id', userId)
        .single();
      setIsAdmin(data?.is_admin ?? false);
      setProfileAvatarUrl(data?.avatar_url ?? null);

      if (data?.is_business) {
        // User is a business owner
        setIsBusiness(true);
        setUserPlan((data.plan as 'free' | 'business') ?? 'free');
        setTeamContext(userId, 'owner', { can_post_dishes: true, can_manage_menu: true });
      } else {
        // Check if user is a team member of a business
        const { data: membership } = await supabase
          .from('business_team_members')
          .select('business_id, role, permissions')
          .eq('user_id', userId)
          .maybeSingle();

        if (membership) {
          // Load the owner's plan to show business UI
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('plan, subscription_status')
            .eq('id', membership.business_id)
            .single();

          if (ownerProfile?.subscription_status === 'active') {
            setIsBusiness(true);
            setUserPlan((ownerProfile.plan as 'free' | 'business') ?? 'free');
            const perms = membership.permissions as { can_post_dishes: boolean; can_manage_menu: boolean };
            setTeamContext(membership.business_id, membership.role as 'owner' | 'member', {
              can_post_dishes: perms?.can_post_dishes ?? true,
              can_manage_menu: perms?.can_manage_menu ?? false,
            });
          } else {
            setIsBusiness(false);
            setUserPlan('free');
            setTeamContext(null, null, null);
          }
        } else {
          setIsBusiness(false);
          setUserPlan((data?.plan as 'free' | 'business') ?? 'free');
          setTeamContext(null, null, null);
        }
      }
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

        // Redeem invite code stored during signup
        const pendingCode = sessionStorage.getItem('mp_invite_code');
        if (pendingCode) {
          fetch('/api/auth/redeem-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: pendingCode }),
          })
            .then((res) => {
              if (res.ok) {
                sessionStorage.removeItem('mp_invite_code');
                posthog.capture(ANALYTICS_EVENTS.INVITE_CODE_REDEEMED, { method });
              }
            })
            .catch(() => {});
        }
      }

      if (event === 'SIGNED_OUT') {
        posthog.reset();
        setIsAdmin(false);
        setIsBusiness(false);
        setUserPlan('free');
        setProfileAvatarUrl(null);
        setTeamContext(null, null, null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setIsAdmin, setIsBusiness, setUserPlan, setProfileAvatarUrl, setTeamContext]);

  return <>{children}</>;
}
