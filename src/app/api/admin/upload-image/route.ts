import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN!;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH!;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimitResponse = await applyRateLimit(user.id, 'upload');
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 413 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    const cfForm = new FormData();
    cfForm.append('file', file, 'admin-upload.jpg');
    cfForm.append('metadata', JSON.stringify({
      app: 'meal.photos',
      userId: user.id,
      purpose: 'blog-og-image',
      uploadedAt: new Date().toISOString(),
    }));

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
        body: cfForm,
      }
    );

    const cfData = await cfRes.json();
    if (!cfData.success) {
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
    }

    const imageId = cfData.result.id as string;
    const url = `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/feed`;

    return NextResponse.json({ imageId, url });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
