import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const EDGE_FUNCTION_SECRET = Deno.env.get('EDGE_FUNCTION_SECRET')!;

Deno.serve(async (req) => {
  // Verify secret
  const secret = req.headers.get('x-edge-secret');
  if (secret !== EDGE_FUNCTION_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get all active businesses with email
  const { data: businesses } = await supabase
    .from('profiles')
    .select('id, business_profiles!inner(business_name, email, address_city)')
    .eq('is_business', true)
    .eq('subscription_status', 'active');

  if (!businesses?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Get dish requests from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: requests } = await supabase
    .from('dish_requests')
    .select('dish_name, upvote_count, location_city')
    .gte('created_at', weekAgo)
    .order('upvote_count', { ascending: false });

  if (!requests?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no_requests' }), { headers: { 'Content-Type': 'application/json' } });
  }

  let sent = 0;

  for (const biz of businesses) {
    const bp = Array.isArray(biz.business_profiles) ? biz.business_profiles[0] : biz.business_profiles;
    if (!bp?.email) continue;

    // Match requests near this business's city
    const nearbyRequests = requests.filter((r) =>
      r.location_city?.toLowerCase() === bp.address_city?.toLowerCase()
    );

    if (!nearbyRequests.length) continue;

    const totalPeople = nearbyRequests.reduce((sum: number, r: { upvote_count: number }) => sum + r.upvote_count, 0);

    const requestListHtml = nearbyRequests
      .slice(0, 5)
      .map((r) => `<li style="margin-bottom: 8px;">"${r.dish_name}" — ${r.upvote_count} ${r.upvote_count === 1 ? 'person' : 'people'}</li>`)
      .join('');

    const html = `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #121212; color: #F5F0E8;">
        <h1 style="font-family: 'Instrument Serif', serif; color: #E8A838; font-size: 24px; margin-bottom: 16px;">
          ${totalPeople} people want dishes near you this week
        </h1>
        <p style="font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
          Here's what people in ${bp.address_city ?? 'your area'} are looking for:
        </p>
        <ul style="font-size: 15px; line-height: 1.5; padding-left: 20px; margin-bottom: 24px;">
          ${requestListHtml}
        </ul>
        <a href="https://meal.photos/post" style="display: inline-block; background: #E8A838; color: #121212; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Post a dish →
        </a>
        <p style="font-size: 12px; color: #888888; margin-top: 32px;">
          You're receiving this because you have an active business subscription on meal.photos.
        </p>
      </div>
    `;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'meal.photos <noreply@meal.photos>',
          to: bp.email,
          subject: `${totalPeople} people want dishes near you this week`,
          html,
        }),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send digest to ${bp.email}:`, err);
    }
  }

  return new Response(JSON.stringify({ sent, total: businesses.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
