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
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)',
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
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
          <svg
            width={28}
            height={28}
            viewBox="0 0 512 512"
            aria-hidden="true"
            className="rounded-md shrink-0"
          >
            <rect width="512" height="512" rx="96" ry="96" fill="var(--bg-primary)" />
            <g
              transform="translate(64, 64) scale(16)"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
              <path d="M7 2v20" />
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
            </g>
          </svg>
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
