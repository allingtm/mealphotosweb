'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';

interface SaveButtonProps {
  dishId: string;
  businessId: string;
  hasSaved: boolean;
  title: string;
}

export function SaveButton({ dishId, businessId, hasSaved: initialHasSaved, title }: SaveButtonProps) {
  const [hasSaved, setHasSaved] = useState(initialHasSaved);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const handleToggle = async () => {
    if (!user) { openAuthModal(); return; }

    const wasSaved = hasSaved;
    setHasSaved(!wasSaved);

    try {
      if (wasSaved) {
        const res = await fetch(`/api/saves/${dishId}`, { method: 'DELETE' });
        if (!res.ok) setHasSaved(true); // Revert
        else posthog.capture('dish_unsaved', { dish_id: dishId });
      } else {
        const res = await fetch('/api/saves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dish_id: dishId }),
        });
        if (!res.ok && res.status !== 409) setHasSaved(false); // Revert
        else posthog.capture('dish_saved', { dish_id: dishId, business_id: businessId });
      }
    } catch {
      setHasSaved(wasSaved); // Revert on network error
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: hasSaved ? 'rgba(232, 168, 56, 0.15)' : 'var(--bg-elevated)',
        color: hasSaved ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: hasSaved ? 600 : 400,
      }}
      aria-label={hasSaved ? `Unsave ${title}` : `Save ${title}`}
    >
      <Bookmark size={16} strokeWidth={1.5} fill={hasSaved ? 'var(--accent-primary)' : 'none'} />
      <span>{hasSaved ? 'Saved' : 'Save'}</span>
    </button>
  );
}
