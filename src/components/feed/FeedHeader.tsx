'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { MenuButton } from '@/components/layout/MenuButton';

export function FeedHeader() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <header
        className="sticky z-40 flex items-center justify-between px-4 md:hidden"
        style={{
          top: 'env(safe-area-inset-top, 0px)',
          height: 56,
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-primary)',
          }}
        >
          meal.photos
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell onClick={() => setIsPanelOpen(true)} />
          <MenuButton />
        </div>
      </header>

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
}
