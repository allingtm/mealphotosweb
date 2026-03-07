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
      className="flex-1 flex items-center justify-center"
      style={{
        backgroundColor: 'var(--bg-primary)',
        minHeight: '100dvh',
      }}
    />
  );
}
