'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { FollowButton } from './FollowButton';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

interface ListUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location_city: string | null;
  is_following_back: boolean;
}

interface FollowerFollowingListProps {
  type: 'followers' | 'following';
  count: number;
  isOpen: boolean;
  onClose: () => void;
}

export function FollowerFollowingList({ type, count, isOpen, onClose }: FollowerFollowingListProps) {
  const t = useTranslations('profile');
  const [users, setUsers] = useState<ListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchPage = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    try {
      const url = new URL(`/api/me/${type}`, window.location.origin);
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      const items = data[type] ?? data.followers ?? data.following ?? [];
      setUsers((prev) => cursor ? [...prev, ...items] : items);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchPage();
      posthog.capture(
        type === 'followers'
          ? ANALYTICS_EVENTS.PROFILE_FOLLOWERS_VIEWED
          : ANALYTICS_EVENTS.PROFILE_FOLLOWING_VIEWED,
        { count }
      );
    }
  }, [isOpen, fetchPage, type, count]);

  useEffect(() => {
    if (!isOpen) {
      hasFetched.current = false;
      setUsers([]);
      setNextCursor(null);
    }
  }, [isOpen]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextCursor && !loading) {
          fetchPage(nextCursor);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [nextCursor, loading, fetchPage]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = type === 'followers'
    ? `${t('followersTitle')} (${count})`
    : `${t('followingTitle')} (${count})`;

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--bg-elevated)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          aria-label={t('back')}
        >
          <ArrowLeft size={24} strokeWidth={1.5} color="var(--text-primary)" />
        </button>
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', height: 'calc(100dvh - 57px)' }}>
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/profile/${u.username}`}
            onClick={onClose}
            className="flex items-center gap-3"
            style={{
              padding: '12px 16px',
              textDecoration: 'none',
              borderBottom: '1px solid var(--bg-elevated)',
            }}
          >
            {/* Avatar */}
            {u.avatar_url ? (
              <Image
                src={u.avatar_url}
                alt={u.username}
                width={40}
                height={40}
                className="rounded-full"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--bg-surface)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  color: 'var(--accent-primary)',
                }}
              >
                {(u.display_name || u.username).charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                @{u.username}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  margin: 0,
                }}
              >
                {[u.display_name, u.location_city].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Follow button */}
            <div onClick={(e) => e.preventDefault()}>
              <FollowButton
                userId={u.id}
                username={u.username}
                initialIsFollowing={u.is_following_back}
              />
            </div>
          </Link>
        ))}

        {loading && (
          <div
            className="flex items-center justify-center"
            style={{ padding: 24, color: 'var(--text-secondary)' }}
          >
            <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          </div>
        )}

        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
}
