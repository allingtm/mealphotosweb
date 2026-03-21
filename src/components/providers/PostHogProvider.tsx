'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { getConsent, hasConsentBeenRecorded } from '@/lib/cookies';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (posthog.__loaded) return;

    const shouldCapture =
      process.env.NODE_ENV !== 'development' &&
      hasConsentBeenRecorded() &&
      getConsent().analytics;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      opt_out_capturing_by_default: !shouldCapture,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
