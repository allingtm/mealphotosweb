import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { inviteCodeServerSchema } from '@/lib/validations';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:invite-validate',
});

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

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

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = inviteCodeServerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code, turnstile_token } = parsed.data;

    // 3. Verify Turnstile token (skip in dev if not configured)
    if (TURNSTILE_SECRET && turnstile_token !== 'dev-bypass') {
      const turnstileRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: TURNSTILE_SECRET,
            response: turnstile_token,
          }),
        }
      );
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return NextResponse.json(
          { error: 'Bot verification failed' },
          { status: 403 }
        );
      }
    }

    // 4. Check invite code validity (service-role bypasses RLS)
    const supabase = createServiceRoleClient();
    const { data: inviteCode, error: dbError } = await supabase
      .from('invite_codes')
      .select('id, max_uses, use_count, is_active, expires_at')
      .eq('code', code)
      .single();

    if (dbError || !inviteCode) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    if (
      !inviteCode.is_active ||
      inviteCode.use_count >= inviteCode.max_uses ||
      (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date())
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error('Invite code validate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
