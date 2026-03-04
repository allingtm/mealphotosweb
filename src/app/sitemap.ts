import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600; // 1 hour ISR

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://meal.photos/', changeFrequency: 'daily', priority: 1.0 },
    {
      url: 'https://meal.photos/map',
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://meal.photos/leaderboard',
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // Dynamic meal pages
  const { data: meals } = await supabase
    .from('meals')
    .select('id, updated_at')
    .order('created_at', { ascending: false })
    .limit(50000);

  const mealPages: MetadataRoute.Sitemap = (meals ?? []).map((meal) => ({
    url: `https://meal.photos/meal/${meal.id}`,
    lastModified: meal.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic profile pages
  const { data: profiles } = await supabase
    .from('profiles')
    .select('username, updated_at')
    .order('created_at', { ascending: false })
    .limit(50000);

  const profilePages: MetadataRoute.Sitemap = (profiles ?? []).map(
    (profile) => ({
      url: `https://meal.photos/profile/${profile.username}`,
      lastModified: profile.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })
  );

  return [...staticPages, ...mealPages, ...profilePages];
}
