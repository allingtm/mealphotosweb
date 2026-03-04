'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/lib/store';

export class AuthDismissedError extends Error {
  constructor() {
    super('Authentication dismissed');
    this.name = 'AuthDismissedError';
  }
}

/**
 * Returns a `requireAuth` function. When called, it checks if the user
 * is authenticated. If not, it opens the AuthModal and returns a Promise
 * that resolves once authentication completes, or rejects if the modal
 * is dismissed without authenticating.
 *
 * Usage: `const requireAuth = useRequireAuth();`
 *        `await requireAuth(); // blocks until authed, throws AuthDismissedError if dismissed`
 */
export function useRequireAuth() {
  const requireAuth = useCallback((): Promise<void> => {
    const { user, openAuthModal } = useAppStore.getState();

    if (user) return Promise.resolve();

    openAuthModal();

    return new Promise<void>((resolve, reject) => {
      const unsub = useAppStore.subscribe((state) => {
        if (state.user) {
          unsub();
          resolve();
        } else if (!state.isAuthModalOpen) {
          unsub();
          reject(new AuthDismissedError());
        }
      });
    });
  }, []);

  return requireAuth;
}
