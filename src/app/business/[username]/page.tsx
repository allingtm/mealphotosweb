import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BusinessProfileClient } from '@/components/business/BusinessProfileClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('profiles')
    .select('avatar_url, business_profiles!inner(business_name, bio, address_city)')
    .eq('username', username)
    .eq('is_business', true)
    .single();

  if (!data) return { title: 'Business not found' };

  const bp = (Array.isArray(data.business_profiles) ? data.business_profiles[0] : data.business_profiles) as { business_name: string; bio: string | null; address_city: string | null };
  return {
    title: bp.business_name,
    description: bp.bio ?? `${bp.business_name} on meal.photos`,
    openGraph: { images: data.avatar_url ? [data.avatar_url] : [] },
  };
}

export default async function BusinessProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch profile + business_profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, username, avatar_url, plan, follower_count, subscription_status,
      business_profiles!inner(*)
    `)
    .eq('username', username)
    .eq('is_business', true)
    .single();

  if (!profile || profile.subscription_status !== 'active') notFound();

  // Normalize business_profiles from array (Supabase join) to single object
  const businessProfiles = Array.isArray(profile.business_profiles)
    ? profile.business_profiles[0]
    : profile.business_profiles;
  const normalizedProfile = { ...profile, business_profiles: businessProfiles };

  // Fetch latest dishes
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, title, photo_url, photo_blur_hash, reaction_count, created_at')
    .eq('business_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(30);

  // Fetch menu sections + items
  const { data: menuSections } = await supabase
    .from('menu_sections')
    .select('*, menu_items(*)')
    .eq('business_id', profile.id)
    .order('sort_order', { ascending: true });

  // Check if current user follows this business
  const { data: { user } } = await supabase.auth.getUser();
  let isFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    isFollowing = !!follow;
  }

  // Total saves across all dishes
  const totalSaves = (dishes ?? []).reduce((sum, d) => sum + (d as { reaction_count: number }).reaction_count, 0);

  return (
    <BusinessProfileClient
      profile={normalizedProfile as Parameters<typeof BusinessProfileClient>[0]['profile']}
      dishes={(dishes ?? []) as Parameters<typeof BusinessProfileClient>[0]['dishes']}
      menuSections={(menuSections ?? []) as Parameters<typeof BusinessProfileClient>[0]['menuSections']}
      isFollowing={isFollowing}
      totalSaves={totalSaves}
    />
  );
}
