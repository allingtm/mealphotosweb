'use client';

import { useCallback } from 'react';
import { Share2 } from 'lucide-react';

interface ShareButtonProps {
  mealId: string;
  title: string;
}

export function ShareButton({ mealId, title }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/meal/${mealId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share dialog
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [mealId, title]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center"
      style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(18, 18, 18, 0.5)',
      }}
      aria-label="Share this meal"
    >
      <Share2 size={24} strokeWidth={1.5} color="var(--text-primary)" />
    </button>
  );
}
