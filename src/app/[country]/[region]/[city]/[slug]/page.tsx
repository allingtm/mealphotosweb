import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Globe, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BUSINESS_TYPE_LABELS, TYPE_GROUP_COLORS, getBusinessTypeGroup } from '@/types/database';
import type { BusinessType } from '@/types/database';
import type { Metadata } from 'next';
import cloudflareLoader from '@/lib/cloudflare-loader';

interface PremisePageProps {
  params: Promise<{ country: string; region: string; city: string; slug: string }>;
}

async function getPremise(country: string, region: string, city: string, slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('business_premises')
    .select('*, profiles!inner(username, display_name, avatar_url)')
    .eq('country_slug', country)
    .eq('region_slug', region)
    .eq('city_slug', city)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  return data;
}

async function getPremiseDishes(premiseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('dishes')
    .select('id, title, photo_url, photo_blur_hash, reaction_count, created_at')
    .eq('premise_id', premiseId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function generateMetadata({ params }: PremisePageProps): Promise<Metadata> {
  const { country, region, city, slug } = await params;
  const premise = await getPremise(country, region, city, slug);
  if (!premise) return { title: 'Not Found' };

  const categories = (premise.business_categories as string[])
    .map((c) => BUSINESS_TYPE_LABELS[c as BusinessType] ?? c)
    .join(', ');
  const location = [premise.address_city, premise.address_region].filter(Boolean).join(', ');

  return {
    title: `${premise.name} — ${location} | meal.photos`,
    description: premise.bio || `${premise.name} — ${categories} in ${location}. Browse real photos of dishes on meal.photos.`,
    openGraph: {
      title: `${premise.name} — ${location}`,
      description: premise.bio || `${categories} in ${location}`,
      type: 'website',
    },
  };
}

export default async function PremisePage({ params }: PremisePageProps) {
  const { country, region, city, slug } = await params;
  const premise = await getPremise(country, region, city, slug);
  if (!premise) notFound();

  const dishes = await getPremiseDishes(premise.id);
  const profile = Array.isArray(premise.profiles) ? premise.profiles[0] : premise.profiles;
  const categories = premise.business_categories as string[];
  const location = [premise.address_city, premise.address_region].filter(Boolean).join(', ');

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 px-4 pt-4 pb-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 mb-4 flex-wrap" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        <Link href={`/${country}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
          {country.toUpperCase()}
        </Link>
        <span>/</span>
        <Link href={`/${country}/${region}`} className="hover:underline capitalize" style={{ color: 'var(--text-secondary)' }}>
          {region.replace(/-/g, ' ')}
        </Link>
        <span>/</span>
        <Link href={`/${country}/${region}/${city}`} className="hover:underline capitalize" style={{ color: 'var(--text-secondary)' }}>
          {city.replace(/-/g, ' ')}
        </Link>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {profile?.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt={premise.name}
            width={64}
            height={64}
            className="rounded-full shrink-0"
            loader={cloudflareLoader}
          />
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {premise.name}
          </h1>
          <div className="flex items-center gap-1.5 mt-1" style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            <MapPin size={14} strokeWidth={1.5} />
            {location}
          </div>
          {profile?.username && (
            <Link
              href={`/business/${profile.username}`}
              className="mt-1 inline-block"
              style={{ fontSize: 13, color: 'var(--accent-primary)', fontFamily: 'var(--font-body)' }}
            >
              @{profile.username}
            </Link>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => {
          const group = getBusinessTypeGroup(cat as BusinessType);
          const color = TYPE_GROUP_COLORS[group];
          return (
            <span
              key={cat}
              className="rounded-full px-3 py-1"
              style={{
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                backgroundColor: `${color}20`,
                color,
              }}
            >
              {BUSINESS_TYPE_LABELS[cat as BusinessType] ?? cat}
            </span>
          );
        })}
      </div>

      {/* Bio */}
      {premise.bio && (
        <p className="mb-6" style={{ fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {premise.bio}
        </p>
      )}

      {/* Contact info */}
      <div className="flex flex-col gap-2 mb-8">
        {premise.address_line_1 && (
          <div className="flex items-center gap-2" style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
            <MapPin size={16} strokeWidth={1.5} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            {[premise.address_line_1, premise.address_line_2, premise.address_city, premise.address_postcode].filter(Boolean).join(', ')}
          </div>
        )}
        {premise.website_url && (
          <a
            href={premise.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            style={{ fontSize: 14, color: 'var(--accent-primary)', fontFamily: 'var(--font-body)' }}
          >
            <Globe size={16} strokeWidth={1.5} />
            Website
          </a>
        )}
        {premise.phone && (
          <a
            href={`tel:${premise.phone}`}
            className="flex items-center gap-2"
            style={{ fontSize: 14, color: 'var(--accent-primary)', fontFamily: 'var(--font-body)' }}
          >
            <Phone size={16} strokeWidth={1.5} />
            {premise.phone}
          </a>
        )}
      </div>

      {/* Dishes */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 16 }}>
        Dishes ({premise.dish_count})
      </h2>

      {dishes.length === 0 ? (
        <p style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
          No dishes posted yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dishes.map((dish) => (
            <Link key={dish.id} href={`/dish/${dish.id}`} className="group">
              <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Image
                  src={dish.photo_url}
                  alt={dish.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  loader={cloudflareLoader}
                />
              </div>
              <p className="mt-1.5 line-clamp-1" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>
                {dish.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
