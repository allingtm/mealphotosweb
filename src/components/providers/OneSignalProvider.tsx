'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const VISIT_COUNT_KEY = 'mp_visit_count';
const PUSH_PROMPTED_KEY = 'mp_push_prompted';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OneSignalSdk = any;

// Module-level promise that resolves with the initialized OneSignal SDK instance
let sdkReadyPromise: Promise<OneSignalSdk> | null = null;
let resolveSdkReady: ((os: OneSignalSdk) => void) | null = null;

export function OneSignalProvider() {
  const user = useAppStore((s) => s.user);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!ONESIGNAL_APP_ID || initializedRef.current) return;
    if (typeof window === 'undefined') return;
    initializedRef.current = true;

    // Create the readiness promise before loading the script
    sdkReadyPromise = new Promise<OneSignalSdk>((resolve) => {
      resolveSdkReady = resolve;
    });

    // Dynamically load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const OneSignal = (window as any).OneSignalDeferred as Array<(os: OneSignalSdk) => void> | undefined;
      if (!OneSignal) return;

      OneSignal.push(async (os: OneSignalSdk) => {
        await os.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
          notifyButton: { enable: false },
        });
        resolveSdkReady?.(os);
      });
    };
    document.head.appendChild(script);
  }, []);

  // Set External ID when user logs in — awaits SDK readiness
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      if (!sdkReadyPromise) return;
      const os = await sdkReadyPromise;
      if (cancelled) return;
      if (os.login) {
        await os.login(user.id);
      }
    })();
    return () => { cancelled = true; };
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

export async function promptForPush() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(PUSH_PROMPTED_KEY) === 'true') return;
  if (!sdkReadyPromise) return;

  try {
    const os = await sdkReadyPromise;
    await os.Slidedown.promptPush();
    localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
  } catch {
    // SDK failed or user dismissed — don't set flag so we can retry next visit
  }
}
