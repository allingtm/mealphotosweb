'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Camera, UtensilsCrossed, Bookmark, MessageCircle, Users, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';

interface DashboardStats {
  today_dishes: number;
  today_reactions: number;
  today_saves: number;
  today_comments: number;
  week_dishes: number;
  week_reactions: number;
  week_saves: number;
  week_followers: number;
}

interface TopDish {
  id: string;
  title: string;
  reaction_count: number;
}

interface DishRequest {
  id: string;
  dish_name: string;
  upvote_count: number;
  location_city: string;
}

interface BusinessDashboardProps {
  userId: string;
}

export function BusinessDashboard({ userId }: BusinessDashboardProps) {
  const userPlan = useAppStore((s) => s.userPlan);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topDishes, setTopDishes] = useState<TopDish[]>([]);
  const [dishRequests, setDishRequests] = useState<DishRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/businesses/dashboard');
        const data = await res.json();
        setStats(data.stats);
        setTopDishes(data.topDishes ?? []);
        setDishRequests(data.dishRequests ?? []);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    fetchDashboard();
  }, []);

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full px-4 pb-24" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <Link href="/settings" aria-label="Settings">
            <Settings size={24} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </Link>
        </div>

        {/* Post a Dish CTA */}
        <Link
          href="/post"
          className="flex items-center justify-center gap-2 w-full rounded-2xl mb-6"
          style={{
            height: 48,
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <PlusCircle size={20} strokeWidth={1.5} />
          Post a Dish
        </Link>

        {loading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Today */}
            <StatsSection title="Today" stats={[
              { icon: Camera, label: 'dishes posted', value: stats?.today_dishes ?? 0 },
              { icon: UtensilsCrossed, label: 'reactions', value: stats?.today_reactions ?? 0 },
              { icon: Bookmark, label: 'saves', value: stats?.today_saves ?? 0 },
              { icon: MessageCircle, label: 'comments', value: stats?.today_comments ?? 0 },
            ]} />

            {/* This Week */}
            <StatsSection title="This Week" stats={[
              { icon: Camera, label: 'dishes posted', value: stats?.week_dishes ?? 0 },
              { icon: UtensilsCrossed, label: 'reactions', value: stats?.week_reactions ?? 0 },
              { icon: Bookmark, label: 'saves', value: stats?.week_saves ?? 0 },
              { icon: Users, label: 'new followers', value: stats?.week_followers ?? 0 },
            ]} />

            {/* Top Dishes */}
            {topDishes.length > 0 && (
              <div>
                <SectionHeader title="Top Dishes" />
                <div className="flex flex-col gap-2">
                  {topDishes.map((dish, i) => (
                    <Link
                      key={dish.id}
                      href={`/dish/${dish.id}`}
                      className="flex items-center gap-3"
                      style={{ textDecoration: 'none', padding: '6px 0' }}
                    >
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', width: 20 }}>
                        {i + 1}.
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>
                        {dish.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {dish.reaction_count} reactions
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Dish Requests */}
            {dishRequests.length > 0 && (
              <div>
                <SectionHeader title="Dish Requests in Your Area" />
                <div className="flex flex-col gap-2">
                  {dishRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between" style={{ padding: '6px 0' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>
                        &ldquo;{req.dish_name}&rdquo;
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {req.upvote_count} people
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics link (Premium only) */}
            {userPlan === 'premium' && (
              <Link
                href="/me"
                style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}
              >
                View Full Analytics →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p
      className="mb-2"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--bg-elevated)',
        paddingBottom: 8,
      }}
    >
      {title}
    </p>
  );
}

function StatsSection({ title, stats }: {
  title: string;
  stats: { icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>; label: string; value: number }[];
}) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="flex flex-col gap-2">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)' }}>
              {value} {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
