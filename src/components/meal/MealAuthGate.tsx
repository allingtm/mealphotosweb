'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function MealAuthGate() {
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  useEffect(() => {
    if (!user) {
      openAuthModal();
    }
  }, [user, openAuthModal]);

  if (user) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center px-6">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent-primary)',
            marginBottom: 8,
          }}
        >
          Sign up to view meals
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}
        >
          Create a free account to see meal details, ratings, and recipes.
        </p>
        <button
          onClick={openAuthModal}
          className="rounded-xl"
          style={{
            height: 48,
            padding: '0 32px',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
