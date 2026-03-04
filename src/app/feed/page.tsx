import { createClient } from '@/lib/supabase/server';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { FeedHeader } from '@/components/feed/FeedHeader';
import type { FeedItem } from '@/types/database';

export default async function FeedPage() {
  const supabase = await createClient();

  const { data } = await supabase.rpc('get_feed', {
    p_limit: 10,
  });

  const meals = (data ?? []) as FeedItem[];
  const nextCursor =
    meals.length === 10 ? meals[meals.length - 1].created_at : null;

  return (
    <>
      <FeedHeader />
      <FeedContainer initialMeals={meals} initialCursor={nextCursor} />
    </>
  );
}
