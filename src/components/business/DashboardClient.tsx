'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff, CreditCard, Loader2, TrendingUp, Star, Trophy, FileText, Settings } from 'lucide-react';
import { DishCard } from './DishCard';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { BUSINESS_TYPE_LABELS, type BusinessType } from '@/types/database';
import posthog from 'posthog-js';

interface MealData {
  id: string;
  title: string;
  photo_url: string;
  avg_rating: number;
  rating_count: number;
  restaurant_revealed: boolean;
}

interface ProfileData {
  display_name: string | null;
  username: string;
  subscription_tier: 'basic' | 'premium' | null;
  subscription_status: string;
  is_restaurant: boolean;
  business_type: BusinessType | null;
  business_name: string | null;
}

interface DashboardClientProps {
  profile: ProfileData;
  meals: MealData[];
  showWelcome: boolean;
}

export function DashboardClient({ profile, meals: initialMeals, showWelcome }: DashboardClientProps) {
  const router = useRouter();
  const [meals, setMeals] = useState(initialMeals);
  const [revealed, setRevealed] = useState(
    initialMeals.length > 0 && initialMeals.every((m) => m.restaurant_revealed)
  );
  const [revealLoading, setRevealLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // Analytics
  const totalRatings = meals.reduce((sum, m) => sum + m.rating_count, 0);
  const ratedMeals = meals.filter((m) => m.rating_count > 0);
  const avgRating =
    ratedMeals.length > 0
      ? ratedMeals.reduce((sum, m) => sum + m.avg_rating, 0) / ratedMeals.length
      : 0;
  const topDish = ratedMeals.length > 0
    ? ratedMeals.reduce((best, m) => (m.avg_rating > best.avg_rating ? m : best), ratedMeals[0])
    : null;

  const handleRevealToggle = async () => {
    setRevealLoading(true);
    try {
      const newRevealed = !revealed;
      const res = await fetch('/api/restaurants/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revealed: newRevealed }),
      });

      if (res.ok) {
        setRevealed(newRevealed);
        setMeals((prev) =>
          prev.map((m) => ({ ...m, restaurant_revealed: newRevealed }))
        );

        if (newRevealed) {
          posthog.capture(ANALYTICS_EVENTS.RESTAURANT_REVEALED, {
            meal_count: meals.length,
          });
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setRevealLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/restaurants/portal', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      }
    } catch {
      setPortalLoading(false);
    }
  };

  const tierLabel = profile.subscription_tier === 'premium' ? 'Premium' : 'Basic';
  const restaurantName = profile.business_name || profile.display_name || profile.username;
  const businessTypeLabel = profile.business_type
    ? BUSINESS_TYPE_LABELS[profile.business_type]
    : null;

  return (
    <div className="px-4 pb-24" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Welcome banner */}
      {showWelcome && !welcomeDismissed && (
        <div
          className="rounded-2xl flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(232, 168, 56, 0.15)',
            padding: '16px 20px',
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--accent-primary)',
              fontWeight: 500,
            }}
          >
            Welcome to your business dashboard!
          </p>
          <button
            type="button"
            onClick={() => setWelcomeDismissed(true)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32, paddingTop: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          {restaurantName}
        </h1>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full"
            style={{
              padding: '2px 10px',
              backgroundColor:
                profile.subscription_tier === 'premium'
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
              color:
                profile.subscription_tier === 'premium'
                  ? '#121212'
                  : 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {tierLabel} Plan
          </span>
          {businessTypeLabel && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              {businessTypeLabel}
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => router.push(`/profile/${profile.username}`)}
            className="flex items-center gap-1.5 rounded-full"
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--bg-elevated)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            <Settings size={14} strokeWidth={1.5} />
            Manage Profile
          </button>
          <button
            type="button"
            onClick={() => {
              posthog.capture(ANALYTICS_EVENTS.BUSINESS_POST_CREATED, { action: 'open_form' });
              router.push(`/profile/${profile.username}?tab=updates`);
            }}
            className="flex items-center gap-1.5 rounded-full"
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--accent-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: '#121212',
            }}
          >
            <FileText size={14} strokeWidth={1.5} />
            Create Post
          </button>
        </div>
      </div>

      {/* Anonymous Testing Section */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}
        >
          Anonymous Testing
        </h2>

        {meals.length > 0 ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
          >
            {meals.map((meal) => (
              <DishCard
                key={meal.id}
                id={meal.id}
                title={meal.title}
                photoUrl={meal.photo_url}
                avgRating={meal.avg_rating}
                ratingCount={meal.rating_count}
                revealed={meal.restaurant_revealed}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: 32,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--text-secondary)',
                marginBottom: 16,
              }}
            >
              No dishes uploaded yet. Upload your first dish to start testing!
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push('/upload?restaurant=true')}
          className="flex items-center gap-2 w-full justify-center py-3 rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginTop: 12,
          }}
        >
          <Plus size={18} strokeWidth={1.5} />
          Upload New Dish
        </button>
      </section>

      {/* Public Profile Section */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}
        >
          Public Profile
        </h2>
        <div
          className="rounded-2xl flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 20px',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-full"
              style={{
                width: 10,
                height: 10,
                backgroundColor: revealed
                  ? 'var(--status-success)'
                  : 'var(--text-secondary)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--text-primary)',
              }}
            >
              {revealed ? 'Live' : 'Hidden'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRevealToggle}
            disabled={revealLoading || meals.length === 0}
            className="flex items-center gap-2 rounded-full"
            style={{
              padding: '8px 16px',
              backgroundColor: revealed ? 'var(--bg-elevated)' : 'var(--accent-primary)',
              color: revealed ? 'var(--text-primary)' : '#121212',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              opacity: meals.length === 0 ? 0.5 : 1,
            }}
          >
            {revealLoading ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : revealed ? (
              <EyeOff size={16} strokeWidth={1.5} />
            ) : (
              <Eye size={16} strokeWidth={1.5} />
            )}
            {revealed ? 'Hide Profile' : 'Reveal Profile'}
          </button>
        </div>
      </section>

      {/* Analytics Section */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}
        >
          Analytics
        </h2>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
        >
          <div
            className="rounded-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', padding: 16 }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Star size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                Avg Rating
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--text-primary)',
              }}
            >
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </span>
          </div>

          <div
            className="rounded-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', padding: 16 }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <TrendingUp size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                Total Ratings
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--text-primary)',
              }}
            >
              {totalRatings.toLocaleString()}
            </span>
          </div>

          <div
            className="rounded-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', padding: 16 }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Trophy size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                Top Dish
              </span>
            </div>
            <span
              className="block truncate"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {topDish ? topDish.title : '-'}
            </span>
            {topDish && (
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  color: 'var(--status-success)',
                }}
              >
                {topDish.avg_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}
        >
          Subscription
        </h2>
        <div
          className="rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '16px 20px',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {tierLabel} Plan
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                £{profile.subscription_tier === 'premium' ? '79' : '29'}/month
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="flex items-center gap-2 w-full justify-center py-3 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {portalLoading ? (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <CreditCard size={16} strokeWidth={1.5} />
            )}
            Manage Subscription
          </button>
        </div>
      </section>
    </div>
  );
}
