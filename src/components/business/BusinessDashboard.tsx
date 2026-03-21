'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlusCircle, Camera, UtensilsCrossed, Bookmark, MessageCircle, Users, Check, BookOpen, User, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { PremiseSwitcher } from './PremiseSwitcher';
import { InboxCommentCard } from './InboxCommentCard';
import type { BusinessPremise, InboxComment } from '@/types/database';

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
  username: string;
}

export function BusinessDashboard({ userId, username }: BusinessDashboardProps) {
  const userPlan = useAppStore((s) => s.userPlan);
  const premises = useAppStore((s) => s.premises);
  const setPremises = useAppStore((s) => s.setPremises);
  const activePremiseId = useAppStore((s) => s.activePremiseId);
  const setActivePremiseId = useAppStore((s) => s.setActivePremiseId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topDishes, setTopDishes] = useState<TopDish[]>([]);
  const [dishRequests, setDishRequests] = useState<DishRequest[]>([]);
  const [recentComments, setRecentComments] = useState<InboxComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [maxPremises, setMaxPremises] = useState(5);

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setShowWelcome(true);
    }
  }, [searchParams]);

  // Load premises
  useEffect(() => {
    async function fetchPremises() {
      try {
        const res = await fetch('/api/businesses/premises?include_inactive=true');
        const data = await res.json();
        const list: BusinessPremise[] = data.premises ?? [];
        setPremises(list);
        if (list.length > 0 && !activePremiseId) {
          setActivePremiseId(list[0].id);
        }
      } catch { /* silently fail */ }
    }
    fetchPremises();
  }, [setPremises, activePremiseId, setActivePremiseId]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/businesses/dashboard');
        const data = await res.json();
        setStats(data.stats);
        setTopDishes(data.topDishes ?? []);
        setDishRequests(data.dishRequests ?? []);
        setRecentComments(data.recentComments ?? []);
        if (data.maxPremises) setMaxPremises(data.maxPremises);
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    }
    fetchDashboard();
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    router.replace('/me');
  };

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      {/* Welcome modal for new subscribers */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="w-full max-w-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 24,
              padding: '32px 24px',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Welcome to meal.photos!
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              Your business is now live. Here&apos;s what to do next:
            </p>

            <div className="flex flex-col gap-3" style={{ marginBottom: 24 }}>
              {[
                { label: 'Post your first dish', href: '/post' },
                { label: 'Set up your menu', href: '/business/menu' },
                { label: 'Complete your profile', href: '/settings' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    <Check size={14} strokeWidth={2} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={dismissWelcome}
              className="w-full py-3 rounded-2xl"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--primary-foreground)',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      <div className="w-full px-4 pb-24 max-w-3xl md:max-w-none">
        {/* Premise Switcher */}
        {premises.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <PremiseSwitcher showAddButton maxPremises={maxPremises} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {premises.filter((p) => p.is_active).length}/{maxPremises} premises
            </span>
          </div>
        )}

        {/* Post a Dish CTA */}
        <Link
          href="/post"
          className="flex items-center justify-center gap-2 w-full rounded-2xl mb-6"
          style={{
            height: 48,
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--primary-foreground)',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <PlusCircle size={20} strokeWidth={1.5} />
          Post a Dish
        </Link>

        {/* Quick action links */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <QuickLink href="/business/menu" icon={BookOpen} label="Menu" />
          <QuickLink href={`/business/${username}`} icon={User} label="Profile" />
          <QuickLink href="/settings" icon={Settings} label="Settings" />
        </div>

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

            {/* Recent Comments */}
            {recentComments.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <SectionHeader title="Recent Comments" />
                  <Link
                    href="/business/comments"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    View all →
                  </Link>
                </div>
                <div className="flex flex-col">
                  {recentComments.map((comment) => (
                    <InboxCommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              </div>
            )}

            {/* Top Dishes */}
            {topDishes.length > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <SectionHeader title="Top Dishes" />
                  <Link
                    href="/business/dishes"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    View all →
                  </Link>
                </div>
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

            {/* Analytics link — hidden until full analytics page is built */}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-3 rounded-2xl"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--bg-elevated)',
        textDecoration: 'none',
      }}
    >
      <Icon size={20} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
      }}>
        {label}
      </span>
    </Link>
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
