'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

interface FollowButtonProps {
  userId: string;
  username: string;
  initialIsFollowing: boolean;
}

export function FollowButton({ userId, username, initialIsFollowing }: FollowButtonProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFollow = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    setLoading(true);
    setIsFollowing(true); // Optimistic

    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: userId }),
      });

      if (!res.ok) {
        setIsFollowing(false);
        showToast(t('followFailed'), 'error');
        return;
      }

      posthog.capture(ANALYTICS_EVENTS.PROFILE_FOLLOW, {
        followed_user_id: userId,
      });
    } catch {
      setIsFollowing(false);
      showToast(t('followFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setShowConfirm(false);
    setLoading(true);
    setIsFollowing(false); // Optimistic

    try {
      const res = await fetch(`/api/follows/${userId}`, { method: 'DELETE' });

      if (!res.ok) {
        setIsFollowing(true);
        showToast(t('unfollowFailed'), 'error');
        return;
      }

      posthog.capture(ANALYTICS_EVENTS.PROFILE_UNFOLLOW, {
        unfollowed_user_id: userId,
      });
    } catch {
      setIsFollowing(true);
      showToast(t('unfollowFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isFollowing) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--accent-primary)',
            backgroundColor: 'transparent',
            border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-full)',
            padding: '8px 24px',
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {t('followingButton')} ✓
        </button>

        {/* Unfollow confirmation */}
        {showConfirm && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setShowConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card)',
                padding: 24,
                width: 280,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 16,
                  color: 'var(--text-primary)',
                  marginBottom: 20,
                }}
              >
                {t('unfollowConfirm', { username })}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-elevated)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 0',
                    cursor: 'pointer',
                  }}
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUnfollow}
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-emphasis)',
                    backgroundColor: 'var(--status-error)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 0',
                    cursor: 'pointer',
                  }}
                >
                  {t('unfollow')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={handleFollow}
      disabled={loading}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--bg-primary)',
        backgroundColor: 'var(--accent-primary)',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        padding: '8px 24px',
        cursor: 'pointer',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {t('follow')}
    </button>
  );
}
