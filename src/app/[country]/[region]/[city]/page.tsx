import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { BUSINESS_TYPE_LABELS, TYPE_GROUP_COLORS, getBusinessTypeGroup } from '@/types/database';
import type { BusinessType } from '@/types/database';
import type { Metadata } from 'next';
import cloudflareLoader from '@/lib/cloudflare-loader';

interface CityPageProps {
  params: Promise<{ country: string; region: string; city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { country, region, city } = await params;
  const cityName = city.replace(/-/g, ' ');
  const regionName = region.replace(/-/g, ' ');
  return {
    title: `Food in ${cityName} — ${regionName} | meal.photos`,
    description: `Discover restaurants, cafés, takeaways and food businesses in ${cityName}. Browse real photos of dishes on meal.photos.`,
  };
}

export default async function CityBrowsePage({ params }: CityPageProps) {
  const { country, region, city } = await params;
  const supabase = await createClient();

  const { data: premises } = await supabase
    .from('business_premises')
    .select('id, name, slug, business_categories, address_city, address_postcode, dish_count, bio, profiles!inner(avatar_url, username)')
    .eq('country_slug', country)
    .eq('region_slug', region)
    .eq('city_slug', city)
    .eq('is_active', true)
    .order('dish_count', { ascending: false })
    .limit(50);

  if (!premises || premises.length === 0) notFound();

  const cityName = city.replace(/-/g, ' ');
  const regionName = region.replace(/-/g, ' ');

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 px-4 pt-4 pb-24">
      <nav className="flex items-center gap-1.5 mb-4" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        <Link href={`/${country}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
          {country.toUpperCase()}
        </Link>
        <span>/</span>
        <Link href={`/${country}/${region}`} className="hover:underline capitalize" style={{ color: 'var(--text-secondary)' }}>
          {regionName}
        </Link>
      </nav>

      <h1 className="capitalize mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)' }}>
        {cityName}
      </h1>
      <p className="mb-8" style={{ fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        {premises.length} food {premises.length === 1 ? 'business' : 'businesses'} in {cityName}
      </p>

      <div className="flex flex-col gap-4">
        {premises.map((premise) => {
          const profile = Array.isArray(premise.profiles) ? premise.profiles[0] : premise.profiles;
          const categories = (premise.business_categories as string[]).slice(0, 3);
          return (
            <Link
              key={premise.id}
              href={`/${country}/${region}/${city}/${premise.slug}`}
              className="flex items-start gap-4 rounded-2xl p-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', textDecoration: 'none' }}
            >
              {profile?.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt={premise.name}
                  width={48}
                  height={48}
                  className="rounded-full shrink-0"
                  loader={cloudflareLoader}
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {premise.name}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {categories.map((cat) => {
                    const group = getBusinessTypeGroup(cat as BusinessType);
                    const color = TYPE_GROUP_COLORS[group];
                    return (
                      <span key={cat} className="rounded-full px-2 py-0.5" style={{ fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 600, backgroundColor: `${color}20`, color }}>
                        {BUSINESS_TYPE_LABELS[cat as BusinessType] ?? cat}
                      </span>
                    );
                  })}
                </div>
                {premise.bio && (
                  <p className="mt-1.5 line-clamp-2" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                    {premise.bio}
                  </p>
                )}
                <span className="mt-1 inline-block" style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                  {premise.dish_count} {premise.dish_count === 1 ? 'dish' : 'dishes'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
