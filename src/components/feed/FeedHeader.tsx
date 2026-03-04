'use client';

import { useState } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

export function FeedHeader() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <header
        className="flex items-center justify-between"
        style={{
          padding: '8px 16px',
          height: 48,
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 400,
            color: 'var(--text-primary)',
          }}
        >
          meal.photos
        </span>
        <NotificationBell onClick={() => setIsPanelOpen(true)} />
      </header>

      <NotificationPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
}
