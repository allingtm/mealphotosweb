'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const user = useAppStore((s) => s.user);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch('/api/notifications/unread-count');
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch {
      // Silently fail
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Also listen for real-time notification inserts
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-full)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell size={24} strokeWidth={1.5} color="var(--text-primary)" />
      {unreadCount > 0 && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 700,
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
