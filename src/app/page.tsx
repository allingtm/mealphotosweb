import { createClient } from '@/lib/supabase/server';
import { blurhashToDataURL } from '@/lib/blurhash-to-data-url';
import { FeedPageClient } from '@/components/feed/FeedPageClient';
import type { FeedItem } from '@/types/database';

export default async function FeedPage() {
  let items: FeedItem[] = [];
  let nextCursor: string | null = null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_feed', {
      p_tab: 'nearby',
      p_limit: 20,
      p_lat: null,
      p_lng: null,
      p_radius_km: 8,
      p_cursor: null,
    });

    if (!error && data) {
      items = data as FeedItem[];
      nextCursor = items.length === 20 ? items[items.length - 1].created_at : null;
    }
  } catch (e) {
    console.error('[FeedPage] Failed to load feed:', e);
  }

  // Pre-compute blur data URLs server-side for the first 3 cards
  const itemsWithBlur = items.map((item, index) => ({
    ...item,
    blurDataURL:
      index < 3 && item.photo_blur_hash
        ? blurhashToDataURL(item.photo_blur_hash)
        : undefined,
  }));

  return <FeedPageClient initialItems={itemsWithBlur} initialCursor={nextCursor} />;
}
