'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { MenuButton } from '@/components/layout/MenuButton';

interface AppBarProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export function AppBar({ title, rightAction }: AppBarProps) {
  const t = useTranslations('feed');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <header
        className="hidden items-center justify-between"
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
          {title ?? t('title')}
        </span>
        <div className="flex items-center gap-1">
          {rightAction}
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
