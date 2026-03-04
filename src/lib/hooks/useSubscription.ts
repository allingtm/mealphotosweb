'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';

interface SubscriptionState {
  loading: boolean;
  isActive: boolean;
  tier: 'basic' | 'premium' | null;
  status: 'active' | 'past_due' | 'cancelled' | 'inactive';
}

export function useSubscription(): SubscriptionState {
  const user = useAppStore((s) => s.user);
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    isActive: false,
    tier: null,
    status: 'inactive',
  });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, isActive: false, tier: null, status: 'inactive' });
      return;
    }

    const supabase = createClient();
    supabase
      .from('profiles')
      .select('subscription_status, subscription_tier')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setState({
            loading: false,
            isActive: data.subscription_status === 'active',
            tier: data.subscription_tier,
            status: data.subscription_status,
          });
        } else {
          setState({ loading: false, isActive: false, tier: null, status: 'inactive' });
        }
      });
  }, [user]);

  return state;
}
