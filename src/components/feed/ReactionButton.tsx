'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';

interface ReactionButtonProps {
  dishId: string;
  businessId: string;
  hasReacted: boolean;
  count: number;
  distanceKm: number | null;
}

export function ReactionButton({ dishId, businessId, hasReacted: initialHasReacted, count: initialCount, distanceKm }: ReactionButtonProps) {
  const [hasReacted, setHasReacted] = useState(initialHasReacted);
  const [count, setCount] = useState(initialCount);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const handleReact = async () => {
    if (hasReacted) return; // Cannot undo
    if (!user) { openAuthModal(); return; }

    // Optimistic update
    setHasReacted(true);
    setCount((c) => c + 1);

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_id: dishId }),
      });

      if (!res.ok && res.status !== 409) {
        // Revert on error (409 means already reacted, which is fine)
        setHasReacted(false);
        setCount((c) => c - 1);
      }

      posthog.capture('dish_reacted', { dish_id: dishId, business_id: businessId, distance_km: distanceKm });
    } catch {
      setHasReacted(false);
      setCount((c) => c - 1);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReact}
      disabled={hasReacted}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: hasReacted ? 'rgba(76, 175, 80, 0.15)' : 'var(--bg-elevated)',
        color: hasReacted ? 'var(--status-success)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: hasReacted ? 600 : 400,
        opacity: hasReacted ? 1 : undefined,
      }}
      aria-label={hasReacted ? `Reacted to dish` : `React to dish`}
    >
      <UtensilsCrossed size={16} strokeWidth={1.5} />
      <span>{hasReacted ? 'Reacted' : "I'd eat that"}</span>
      {count > 0 && <span className="font-semibold">{count}</span>}
    </button>
  );
}
