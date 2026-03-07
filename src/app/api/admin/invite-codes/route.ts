import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createInviteCodeSchema } from '@/lib/validations';
import crypto from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:admin-invite-codes',
});

async function checkAdmin(request: NextRequest) {
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

/** GET: List all invite codes with usage stats */
export async function GET(request: NextRequest) {
  try {
    const user = await checkAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { success: rateLimitOk } = await ratelimit.limit(user.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data: codes, error } = await serviceClient
      .from('invite_codes')
      .select('id, code, label, max_uses, use_count, is_active, expires_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin invite codes list error:', error);
      return NextResponse.json({ error: 'Failed to fetch invite codes' }, { status: 500 });
    }

    return NextResponse.json({ codes });
  } catch (err) {
    console.error('Admin invite codes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST: Generate new invite code(s) */
export async function POST(request: NextRequest) {
  try {
    const user = await checkAdmin(request);
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { success: rateLimitOk } = await ratelimit.limit(user.id);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createInviteCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const serviceClient = createServiceRoleClient();
    const { data: inviteCode, error } = await serviceClient
      .from('invite_codes')
      .insert({
        code,
        label: parsed.data.label || null,
        max_uses: parsed.data.max_uses,
        expires_at: parsed.data.expires_at || null,
        created_by: user.id,
      })
      .select('id, code, label, max_uses, use_count, is_active, expires_at, created_at')
      .single();

    if (error) {
      // Handle unlikely collision
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Code collision, please try again' }, { status: 409 });
      }
      console.error('Admin invite code create error:', error);
      return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 });
    }

    return NextResponse.json({ code: inviteCode }, { status: 201 });
  } catch (err) {
    console.error('Admin invite codes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
