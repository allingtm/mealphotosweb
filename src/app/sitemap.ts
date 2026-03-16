import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://meal.photos/', changeFrequency: 'hourly', priority: 1 },
    { url: 'https://meal.photos/map', changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://meal.photos/search', changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://meal.photos/pricing', changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://meal.photos/about', changeFrequency: 'monthly', priority: 0.3 },
  ];

  const { data: businesses } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .eq('is_business', true)
    .eq('subscription_status', 'active');

  const businessPages: MetadataRoute.Sitemap = businesses?.map((b) => ({
    url: `https://meal.photos/business/${b.username}`,
    lastModified: b.updated_at,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  })) ?? [];

  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  const dishPages: MetadataRoute.Sitemap = dishes?.map((d) => ({
    url: `https://meal.photos/dish/${d.id}`,
    lastModified: d.created_at,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  })) ?? [];

  return [...staticPages, ...businessPages, ...dishPages];
}
