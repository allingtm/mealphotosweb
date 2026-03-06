'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';
import type { FollowSuggestion } from '@/types/database';

interface FollowSuggestionsProps {
  city?: string | null;
}

export function FollowSuggestions({ city }: FollowSuggestionsProps) {
  const t = useTranslations('feed');
  const tProfile = useTranslations('profile');
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.rpc('get_follow_suggestions', {
        ...(city ? { p_city: city } : {}),
        p_limit: 5,
      });

      if (data && data.length > 0) {
        setSuggestions(data as FollowSuggestion[]);
        posthog.capture(ANALYTICS_EVENTS.FOLLOW_SUGGESTION_SHOWN, {
          suggested_user_ids: (data as FollowSuggestion[]).map((s) => s.id),
        });
      }
      setLoading(false);
    }
    load();
  }, [city]);

  const handleFollow = async (userId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: (await supabase.auth.getUser()).data.user!.id, following_id: userId });

    if (!error) {
      setFollowedIds((prev) => new Set(prev).add(userId));
      posthog.capture(ANALYTICS_EVENTS.FOLLOW_SUGGESTION_TAPPED, {
        suggested_user_id: userId,
      });
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div style={{ padding: '16px 24px' }}>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginBottom: 16,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {t('suggestionsTitle')}
      </p>

      <div className="flex flex-col gap-3">
        {suggestions.map((user) => {
          const isFollowed = followedIds.has(user.id);
          return (
            <div
              key={user.id}
              className="flex items-center gap-3"
              style={{
                padding: '8px 12px',
                borderRadius: 16,
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <Link href={`/profile/${user.username}`}>
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="rounded-full"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${user.username}`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  @{user.username}
                </Link>
                <p
                  className="flex items-center gap-1"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 2,
                  }}
                >
                  {user.meal_count} meals
                  <Star size={10} strokeWidth={1.5} fill="var(--accent-primary)" color="var(--accent-primary)" />
                  {user.avg_rating ?? '—'} avg
                </p>
              </div>

              <button
                onClick={() => handleFollow(user.id)}
                disabled={isFollowed}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 16px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: isFollowed ? 'default' : 'pointer',
                  backgroundColor: isFollowed ? 'var(--bg-elevated)' : 'var(--accent-primary)',
                  color: isFollowed ? 'var(--text-secondary)' : 'var(--bg-primary)',
                }}
              >
                {isFollowed ? tProfile('followingButton') : tProfile('follow')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
