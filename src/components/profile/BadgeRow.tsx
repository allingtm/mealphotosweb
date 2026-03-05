'use client';

import {
  Flame, ChefHat, Heart, Star, Utensils, Award, Camera, Users, Trophy, Sparkles,
} from 'lucide-react';
import type { UserBadge } from '@/types/database';

const BADGE_CONFIG: Record<string, { label: string; icon: typeof Flame }> = {
  on_fire: { label: 'On Fire', icon: Flame },
  head_chef: { label: 'Head Chef', icon: ChefHat },
  crowd_pleaser: { label: 'Crowd Pleaser', icon: Heart },
  rising_star: { label: 'Rising Star', icon: Star },
  recipe_maker: { label: 'Recipe Maker', icon: Utensils },
  first_meal: { label: 'First Meal', icon: Camera },
  community_builder: { label: 'Community', icon: Users },
  top_rated: { label: 'Top Rated', icon: Trophy },
  streak_master: { label: 'Streak Master', icon: Award },
  foodie: { label: 'Foodie', icon: Sparkles },
};

interface BadgeRowProps {
  badges: UserBadge[];
}

export function BadgeRow({ badges }: BadgeRowProps) {
  if (badges.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{
        padding: '12px 16px',
        scrollbarWidth: 'none',
      }}
    >
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge.badge_type];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <div
            key={badge.id}
            className="flex items-center gap-1 shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 12px',
            }}
          >
            <Icon size={14} strokeWidth={1.5} color="var(--accent-primary)" />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
