import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateInviteCodeSchema } from '@/lib/validations/invite-code';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rateLimited = await applyRateLimit(ip, 'auth');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = validateInviteCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const { data } = await serviceClient
      .from('invite_codes')
      .select('current_uses, max_uses, expires_at')
      .eq('code', parsed.data.code)
      .eq('is_active', true)
      .single();

    if (!data) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' });
    }

    if (data.current_uses >= data.max_uses) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' });
    }

    if (data.expires_at && new Date(data.expires_at) <= new Date()) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired invite code' });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
