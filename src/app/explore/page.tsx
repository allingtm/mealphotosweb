import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, UtensilsCrossed } from 'lucide-react';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Explore Food Around the World | meal.photos',
  description:
    'Discover the best rated meals by city, country, and cuisine. Browse real community ratings and find top food wherever you are.',
  alternates: { canonical: '/explore' },
};

interface ExploreSlug {
  slug_type: string;
  slug_value: string;
  display_name: string;
  country: string | null;
  meal_count: number;
  avg_score: number;
}

export default async function ExploreIndexPage() {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.rpc('get_explore_slugs');
  const slugs = (data ?? []) as unknown as ExploreSlug[];

  const cities = slugs
    .filter((s) => s.slug_type === 'city')
    .sort((a, b) => b.meal_count - a.meal_count);

  const countries = slugs
    .filter((s) => s.slug_type === 'country')
    .sort((a, b) => b.meal_count - a.meal_count);

  const cuisines = slugs
    .filter((s) => s.slug_type === 'cuisine')
    .sort((a, b) => b.meal_count - a.meal_count);

  return (
    <div
      style={{
        minHeight: 'calc(100dvh - 56px)',
        backgroundColor: 'var(--bg-primary)',
        padding: '16px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}
      >
        Explore food around the world
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: '0 0 32px',
        }}
      >
        Discover the best rated meals by city, country, and cuisine — all rated by the meal.photos community.
      </p>

      {/* Cuisines */}
      {cuisines.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2
            className="flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
            }}
          >
            <UtensilsCrossed size={20} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            By cuisine
          </h2>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((c) => (
              <Link
                key={c.slug_value}
                href={`/explore/cuisine/${c.slug_value}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                {c.display_name}
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {c.meal_count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Cities */}
      {cities.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2
            className="flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
            }}
          >
            <MapPin size={20} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            By city
          </h2>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.slug_value}
                href={`/explore/${c.slug_value}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                {c.display_name}
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {c.meal_count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Countries */}
      {countries.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
            }}
          >
            By country
          </h2>
          <div className="flex flex-wrap gap-2">
            {countries.map((c) => (
              <Link
                key={c.slug_value}
                href={`/explore/${c.slug_value}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                {c.display_name}
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  {c.meal_count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {cities.length === 0 && countries.length === 0 && cuisines.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 16px',
          }}
        >
          <MapPin size={48} strokeWidth={1} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-secondary)' }}>
            No explore pages yet. Upload meals with locations to see them appear here.
          </p>
        </div>
      )}

      <div style={{ height: 56 }} />
    </div>
  );
}
