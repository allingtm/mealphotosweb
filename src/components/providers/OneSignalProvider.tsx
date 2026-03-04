'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const VISIT_COUNT_KEY = 'mp_visit_count';
const PUSH_PROMPTED_KEY = 'mp_push_prompted';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OneSignalDeferred = Array<(os: any) => void>;

function getOneSignalDeferred(): OneSignalDeferred | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).OneSignalDeferred as OneSignalDeferred | undefined;
}

export function OneSignalProvider() {
  const user = useAppStore((s) => s.user);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!ONESIGNAL_APP_ID || initializedRef.current) return;
    if (typeof window === 'undefined') return;

    // Dynamically load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onload = () => {
      const OneSignal = getOneSignalDeferred();
      if (!OneSignal) return;

      OneSignal.push(async (os) => {
        await os.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
          notifyButton: { enable: false },
        });
        initializedRef.current = true;
      });
    };
    document.head.appendChild(script);
  }, []);

  // Set External ID when user logs in
  useEffect(() => {
    if (!user || !initializedRef.current) return;

    const OneSignal = getOneSignalDeferred();
    if (!OneSignal) return;

    OneSignal.push(async (os) => {
      if (os.login) {
        await os.login(user.id);
      }
    });
  }, [user]);

  // Track visits and prompt for push at the right time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(PUSH_PROMPTED_KEY) === 'true') return;

    // Increment visit count
    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    // Prompt on 3rd visit
    if (count >= 3) {
      promptForPush();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function promptForPush() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PUSH_PROMPTED_KEY) === 'true') return;

  const OneSignal = getOneSignalDeferred();
  if (!OneSignal) return;

  OneSignal.push(async (os) => {
    if (os.Slidedown) {
      await os.Slidedown.promptPush();
      localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    }
  });
}
