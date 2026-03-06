import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  // RLS handles access control - private meal images only visible to authorized users
  const { data: images, error } = await supabase
    .from('meal_images')
    .select('id, meal_id, position, cloudflare_image_id, photo_url, photo_blur_hash')
    .eq('meal_id', id)
    .order('position', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load images', details: error.message },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ images: images ?? [] });
  response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
  return response;
}
