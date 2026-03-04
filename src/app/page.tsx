import { createClient } from '@/lib/supabase/server';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { blurhashToDataURL } from '@/lib/blurhash-to-data-url';
import type { FeedItem } from '@/types/database';

export default async function FeedPage() {
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_feed', {
    p_limit: 10,
  });

  const meals = (data ?? []) as FeedItem[];
  const nextCursor =
    meals.length === 10 ? meals[meals.length - 1].created_at : null;

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
