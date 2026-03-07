import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { inviteCodeSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'rl:invite-redeem',
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success: rateLimitOk } = await ratelimit.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    // 2. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 3. Parse and validate body
    const body = await request.json();
    const parsed = inviteCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // 4. Redeem via atomic DB function (service-role bypasses RLS)
    const serviceClient = createServiceRoleClient();
    const { data, error: rpcError } = await serviceClient.rpc('redeem_invite_code', {
      p_code: parsed.data.code,
      p_user_id: user.id,
      p_email: user.email || '',
    });

    if (rpcError) {
      console.error('Invite code redeem RPC error:', rpcError);
      return NextResponse.json({ error: 'Failed to redeem invite code' }, { status: 500 });
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Invite code redeem error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
