'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';

interface DishRequestCardProps {
  id: string;
  dishName: string;
  locationCity: string;
  upvoteCount: number;
  userHasUpvoted: boolean;
}

export function DishRequestCard({ id, dishName, locationCity, upvoteCount: initialCount, userHasUpvoted: initialUpvoted }: DishRequestCardProps) {
  const [hasUpvoted, setHasUpvoted] = useState(initialUpvoted);
  const [count, setCount] = useState(initialCount);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const handleUpvote = async () => {
    if (hasUpvoted) return;
    if (!user) { openAuthModal(); return; }

    setHasUpvoted(true);
    setCount((c) => c + 1);

    try {
      const res = await fetch(`/api/dish-requests/${id}/upvote`, { method: 'POST' });
      if (!res.ok && res.status !== 409) {
        setHasUpvoted(false);
        setCount((c) => c - 1);
      } else {
        posthog.capture('dish_request_upvoted', { request_id: id });
      }
    } catch {
      setHasUpvoted(false);
      setCount((c) => c - 1);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
          &ldquo;{dishName} in {locationCity}&rdquo;
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          Requested by {count} {count === 1 ? 'person' : 'people'}
        </p>
      </div>

      <button
        type="button"
        onClick={handleUpvote}
        disabled={hasUpvoted}
        className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors shrink-0"
        style={{
          backgroundColor: hasUpvoted ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-elevated)',
          color: hasUpvoted ? 'var(--accent-primary)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
        }}
      >
        {hasUpvoted ? 'You want this' : 'I want this too'}
      </button>
    </div>
  );
}
