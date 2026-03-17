import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

// Reserved top-level slugs that are NOT country codes
const RESERVED_SLUGS = new Set([
  'map', 'search', 'blog', 'me', 'post', 'admin', 'settings',
  'pricing', 'about', 'contact', 'legal', 'auth', 'api',
  'business', 'dish', 'profile', 'opengraph-image', 'sitemap.xml',
]);

interface CountryPageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { country } = await params;
  if (RESERVED_SLUGS.has(country)) return { title: 'Not Found' };
  const countryName = country.length === 2 ? country.toUpperCase() : country;
  return {
    title: `Food in ${countryName} | meal.photos`,
    description: `Discover restaurants, cafés, takeaways and food businesses across ${countryName}. Browse real photos of dishes on meal.photos.`,
  };
}

export default async function CountryBrowsePage({ params }: CountryPageProps) {
  const { country } = await params;

  // Don't handle reserved slugs — let Next.js fall through to 404
  if (RESERVED_SLUGS.has(country)) notFound();

  const supabase = await createClient();

  // Get regions in this country with premise counts
  const { data: premises } = await supabase
    .from('business_premises')
    .select('region_slug, address_region')
    .eq('country_slug', country)
    .eq('is_active', true);

  if (!premises || premises.length === 0) notFound();

  // Group by region
  const regionMap = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of premises) {
    const existing = regionMap.get(p.region_slug);
    if (existing) {
      existing.count++;
    } else {
      regionMap.set(p.region_slug, { slug: p.region_slug, name: p.address_region ?? p.region_slug, count: 1 });
    }
  }
  const regions = Array.from(regionMap.values()).sort((a, b) => b.count - a.count);

  const countryDisplay = country.length === 2 ? country.toUpperCase() : country;

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 px-4 pt-4 pb-24">
      <h1 className="mb-2" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)' }}>
        Food in {countryDisplay}
      </h1>
      <p className="mb-8" style={{ fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        {premises.length} food {premises.length === 1 ? 'business' : 'businesses'} across {regions.length} {regions.length === 1 ? 'region' : 'regions'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {regions.map((region) => (
          <Link
            key={region.slug}
            href={`/${country}/${region.slug}`}
            className="flex items-center gap-3 rounded-2xl p-4 transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', textDecoration: 'none' }}
          >
            <MapPin size={20} strokeWidth={1.5} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <h2 className="capitalize" style={{ fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {region.name}
              </h2>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                {region.count} {region.count === 1 ? 'business' : 'businesses'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
