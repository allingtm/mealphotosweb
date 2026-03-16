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
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:pl-22 lg:pr-84"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 56,
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md"
          />
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
