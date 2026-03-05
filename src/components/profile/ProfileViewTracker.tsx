'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

interface ProfileViewTrackerProps {
  username: string;
  isRestaurant: boolean;
}

export function ProfileViewTracker({ username, isRestaurant }: ProfileViewTrackerProps) {
  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.PROFILE_VIEWED, {
      viewed_username: username,
      is_own_profile: false,
      is_restaurant: isRestaurant,
    });
  }, [username, isRestaurant]);

  return null;
}
