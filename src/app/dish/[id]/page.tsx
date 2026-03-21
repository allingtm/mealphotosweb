import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DishDetailClient } from '@/components/dish/DishDetailClient';
import type { Metadata } from 'next';
import type { DishImage } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: dish } = await supabase
    .from('dishes')
    .select('title, description, photo_url')
    .eq('id', id)
    .single();

  if (!dish) return { title: 'Dish not found' };

  return {
    title: dish.title,
    description: dish.description ?? dish.title,
    openGraph: { images: [dish.photo_url] },
    alternates: { canonical: `https://meal.photos/dish/${id}` },
  };
}

export default async function DishDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dish } = await supabase
    .from('dishes')
    .select(`
      *,
      profiles!inner(username, avatar_url, plan),
      business_profiles!inner(business_name, business_type, address_city, address_line_1)
    `)
    .eq('id', id)
    .single();

  if (!dish) notFound();

  // Fetch dish images if multi-photo
  let images: DishImage[] = [];
  if (dish.image_count > 1) {
    const { data } = await supabase
      .from('dish_images')
      .select('*')
      .eq('dish_id', id)
      .order('position', { ascending: true });
    images = (data as DishImage[]) ?? [];
  }

  // Check user's reaction/save state
  const { data: { user } } = await supabase.auth.getUser();
  let userHasReacted = false;
  let userHasSaved = false;

  if (user) {
    const [reactionResult, saveResult] = await Promise.all([
      supabase.from('reactions').select('dish_id').eq('dish_id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('saves').select('dish_id').eq('dish_id', id).eq('user_id', user.id).maybeSingle(),
    ]);
    userHasReacted = !!reactionResult.data;
    userHasSaved = !!saveResult.data;
  }

  const isOwner = user?.id === dish.business_id;

  const bp = Array.isArray(dish.business_profiles)
    ? dish.business_profiles[0]
    : dish.business_profiles;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: dish.title,
    description: dish.description ?? undefined,
    image: dish.photo_url,
    datePublished: dish.created_at,
    ...(dish.price_pence && {
      offers: {
        '@type': 'Offer',
        price: (dish.price_pence / 100).toFixed(2),
        priceCurrency: 'GBP',
        availability: 'https://schema.org/InStock',
      },
    }),
    ...(dish.reaction_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 5,
        ratingCount: dish.reaction_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(bp && {
      provider: {
        '@type': 'FoodEstablishment',
        name: bp.business_name,
        ...(bp.address_city && {
          address: {
            '@type': 'PostalAddress',
            addressLocality: bp.address_city,
          },
        }),
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DishDetailClient
        dish={dish}
        images={images}
        userHasReacted={userHasReacted}
        userHasSaved={userHasSaved}
        isOwner={isOwner}
      />
    </>
  );
}
