'use client';

import { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import posthog from 'posthog-js';
import { showToast } from '@/components/ui/Toast';

interface ShareButtonProps {
  dishId: string;
  title: string;
  businessName: string;
}

export function ShareButton({ dishId, title, businessName }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/dish/${dishId}`;
    const text = `${title} from ${businessName} on meal.photos`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        posthog.capture('dish_shared', { dish_id: dishId, share_method: 'native' });
      } catch {
        // User cancelled share dialog
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard', 'success');
      posthog.capture('dish_shared', { dish_id: dishId, share_method: 'clipboard' });
    }
  }, [dishId, title, businessName]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
      }}
      aria-label={`Share ${title}`}
    >
      <Share2 size={16} strokeWidth={1.5} />
      <span>Share</span>
    </button>
  );
}
