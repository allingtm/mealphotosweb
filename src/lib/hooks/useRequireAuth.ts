'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/lib/store';

/**
 * Returns a `requireAuth` function. When called, it checks if the user
 * is authenticated. If not, it opens the AuthModal and returns a Promise
 * that resolves once authentication completes (user state changes to non-null).
 *
 * Usage: `const requireAuth = useRequireAuth();`
 *        `await requireAuth(); // blocks until authed`
 */
export function useRequireAuth() {
  const requireAuth = useCallback((): Promise<void> => {
    const { user, openAuthModal } = useAppStore.getState();

    if (user) return Promise.resolve();

    openAuthModal();

    return new Promise<void>((resolve) => {
      const unsub = useAppStore.subscribe((state) => {
        if (state.user) {
          unsub();
          resolve();
        }
      });
    });
  }, []);

  return requireAuth;
}
