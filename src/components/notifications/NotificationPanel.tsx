'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Star,
  BookOpen,
  Unlock,
  Trophy,
  Flame,
  UserPlus,
  BellRing,
} from 'lucide-react';
import posthog from 'posthog-js';
import type { Notification } from '@/types/database';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { timeAgo } from '@/lib/utils/timeAgo';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_ICONS: Record<string, typeof Star> = {
  rating_milestone: Star,
  recipe_near_unlock: BookOpen,
  recipe_unlocked: Unlock,
  leaderboard_move: Trophy,
  streak_reminder: Flame,
  streak_milestone: Flame,
  new_follower: UserPlus,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  rating_milestone: 'var(--accent-primary)',
  recipe_near_unlock: 'var(--accent-primary)',
  recipe_unlocked: 'var(--status-success)',
  leaderboard_move: 'var(--accent-primary)',
  streak_reminder: 'var(--status-error)',
  streak_milestone: 'var(--status-success)',
  new_follower: 'var(--text-primary)',
};

function getNavigationUrl(notification: Notification): string | null {
  const data = notification.data as Record<string, unknown>;
  switch (notification.type) {
    case 'rating_milestone':
    case 'recipe_near_unlock':
    case 'recipe_unlocked':
      return data.meal_id ? `/meal/${data.meal_id}` : null;
    case 'leaderboard_move':
      return '/leaderboard';
    case 'new_follower':
      return data.follower_username
        ? `/profile/${data.follower_username}`
        : null;
    case 'streak_reminder':
      return '/upload';
    case 'streak_milestone':
      return '/profile';
    default:
      return null;
  }
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (!reset && cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();

      const newNotifications = (data.notifications ?? []) as Notification[];

      // Track streak milestone analytics
      for (const n of newNotifications) {
        if (n.type === 'streak_milestone' && !n.read) {
          const streakDays = (n.data as Record<string, unknown>).streak_days;
          posthog.capture(ANALYTICS_EVENTS.STREAK_MILESTONE, {
            streak_days: streakDays,
          });
        }
      }

      if (reset) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Delay to avoid catching the bell click
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleTap = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_ids: [notification.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      } catch {
        // Continue navigation even if mark-read fails
      }
    }

    // Navigate
    const url = getNavigationUrl(notification);
    if (url) {
      onClose();
      router.push(url);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read)
      .map((n) => n.id);

    if (unreadIds.length === 0) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: unreadIds }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch {
      // Silently fail
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 z-[70] flex flex-col"
        style={{
          width: 'min(380px, 100vw)',
          backgroundColor: 'var(--bg-surface)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--bg-elevated)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--accent-primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Close notifications"
            >
              <X size={20} strokeWidth={1.5} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: '8px 0' }}
        >
          {notifications.length === 0 && !loading && (
            <div
              className="flex flex-col items-center justify-center gap-2"
              style={{ padding: '48px 24px', textAlign: 'center' }}
            >
              <BellRing
                size={40}
                strokeWidth={1}
                color="var(--text-secondary)"
              />
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text-secondary)',
                }}
              >
                No notifications yet
              </p>
            </div>
          )}

          {notifications.map((notification) => {
            const Icon =
              NOTIFICATION_ICONS[notification.type] ?? BellRing;
            const iconColor =
              NOTIFICATION_COLORS[notification.type] ?? 'var(--text-secondary)';

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleTap(notification)}
                className="flex items-start gap-3 w-full text-left"
                style={{
                  padding: '12px 16px',
                  backgroundColor: notification.read
                    ? 'transparent'
                    : 'rgba(232, 168, 56, 0.06)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.5} color={iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: notification.read ? 400 : 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {notification.title}
                  </p>
                  {notification.body && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        margin: '2px 0 0',
                        lineHeight: 1.3,
                      }}
                    >
                      {notification.body}
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      margin: '4px 0 0',
                    }}
                  >
                    {timeAgo(notification.created_at)}
                  </p>
                </div>

                {/* Unread dot */}
                {!notification.read && (
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--accent-primary)',
                      marginTop: 6,
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Load more */}
          {hasMore && notifications.length > 0 && (
            <button
              type="button"
              onClick={() => fetchNotifications(false)}
              disabled={loading}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--accent-primary)',
                background: 'none',
                border: 'none',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}

          {loading && notifications.length === 0 && (
            <div className="flex items-center justify-center" style={{ padding: 32 }}>
              <div
                className="animate-spin rounded-full"
                style={{
                  width: 24,
                  height: 24,
                  border: '2px solid var(--text-secondary)',
                  borderTopColor: 'var(--accent-primary)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
