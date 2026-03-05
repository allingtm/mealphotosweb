import { createClient } from '@/lib/supabase/server';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { blurhashToDataURL } from '@/lib/blurhash-to-data-url';
import type { FeedItem } from '@/types/database';

export default async function FeedPage() {
  let meals: FeedItem[] = [];
  let nextCursor: string | null = null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_feed', {
      p_limit: 10,
    });

    if (!error && data) {
      meals = data as FeedItem[];
      nextCursor =
        meals.length === 10 ? meals[meals.length - 1].created_at : null;
    }
  } catch (e) {
    // Log for server-side diagnostics
    console.error('[FeedPage] Failed to load feed:', e);
    // Fall through with empty feed — FeedContainer handles empty state
  }

  // Pre-compute blur data URLs server-side for the first 3 cards
  const mealsWithBlur = meals.map((meal, index) => ({
    ...meal,
    blurDataURL:
      index < 3 && meal.photo_blur_hash
        ? blurhashToDataURL(meal.photo_blur_hash)
        : undefined,
  }));

  return (
    <>
      <FeedHeader />
      <FeedContainer initialMeals={mealsWithBlur} initialCursor={nextCursor} />
    </>
  );
}
