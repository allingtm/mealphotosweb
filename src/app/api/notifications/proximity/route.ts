import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'write');
  if (rateLimited) return rateLimited;

  const { business_id, dish_title, business_name } = await req.json();
  if (!business_id || !dish_title || !business_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Create in-app notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    type: 'proximity',
    title: `You're near ${business_name}!`,
    body: `You saved the ${dish_title} — it's nearby!`,
    data: { business_id },
  });

  // Send push notification
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'x-edge-secret': process.env.EDGE_FUNCTION_SECRET!,
    },
    body: JSON.stringify({
      user_id: user.id,
      title: `You're near ${business_name}!`,
      body: `You saved the ${dish_title} — it's nearby!`,
      url: `/business/${business_id}`,
    }),
  }).catch(() => {});

  return NextResponse.json({ success: true }, { status: 201 });
}
