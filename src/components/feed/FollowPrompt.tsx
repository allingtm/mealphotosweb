'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';

interface FollowPromptProps {
  userId: string;
  username: string;
  score: number;
  onDismiss: () => void;
}

export function FollowPrompt({ userId, username, score, onDismiss }: FollowPromptProps) {
  const t = useTranslations('feed');
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleFollow = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: userId });

    if (!error) {
      setFollowed(true);
      posthog.capture(ANALYTICS_EVENTS.FOLLOW_PROMPT_AFTER_RATING, {
        rated_user_id: userId,
        rating_score: score,
        followed: true,
      });
      setTimeout(onDismiss, 1000);
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        fontFamily: 'var(--font-body)',
        padding: '8px 0',
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        {t('followPromptRated', { username, score })}
      </p>
      {!followed ? (
        <button
          onClick={handleFollow}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          {t('followPrompt', { username })}
        </button>
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--status-success)',
          }}
        >
          ✓ {t('followingLabel')}
        </span>
      )}
    </div>
  );
}
