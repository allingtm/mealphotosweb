import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

interface RegionPageProps {
  params: Promise<{ country: string; region: string }>;
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { country, region } = await params;
  const regionName = region.replace(/-/g, ' ');
  return {
    title: `Food in ${regionName} | meal.photos`,
    description: `Discover restaurants, cafés, takeaways and food businesses across ${regionName}. Browse real photos of dishes on meal.photos.`,
  };
}

export default async function RegionBrowsePage({ params }: RegionPageProps) {
  const { country, region } = await params;
  const supabase = await createClient();

  // Get cities in this region with premise counts
  const { data: premises } = await supabase
    .from('business_premises')
    .select('city_slug, address_city')
    .eq('country_slug', country)
    .eq('region_slug', region)
    .eq('is_active', true);

  if (!premises || premises.length === 0) notFound();

  // Group by city
  const cityMap = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of premises) {
    const existing = cityMap.get(p.city_slug);
    if (existing) {
      existing.count++;
    } else {
      cityMap.set(p.city_slug, { slug: p.city_slug, name: p.address_city ?? p.city_slug, count: 1 });
    }
  }
  const cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);

  const regionName = region.replace(/-/g, ' ');

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 px-4 pt-4 pb-24">
      <nav className="flex items-center gap-1.5 mb-4" style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        <Link href={`/${country}`} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
          {country.toUpperCase()}
        </Link>
      </nav>

      <h1 className="capitalize mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)' }}>
        {regionName}
      </h1>
      <p className="mb-8" style={{ fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        {premises.length} food {premises.length === 1 ? 'business' : 'businesses'} across {cities.length} {cities.length === 1 ? 'town' : 'towns'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/${country}/${region}/${city.slug}`}
            className="flex items-center gap-3 rounded-2xl p-4 transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', textDecoration: 'none' }}
          >
            <MapPin size={20} strokeWidth={1.5} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <h2 className="capitalize" style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {city.name}
              </h2>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                {city.count} {city.count === 1 ? 'business' : 'businesses'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
