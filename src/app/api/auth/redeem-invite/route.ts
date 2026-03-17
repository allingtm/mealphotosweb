import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { validateInviteCodeSchema } from '@/lib/validations/invite-code';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rateLimited = await applyRateLimit(ip, 'auth');
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = validateInviteCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check if user already redeemed a code
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('invite_code_id')
      .eq('id', user.id)
      .single();

    if (profile?.invite_code_id) {
      return NextResponse.json({ success: true, message: 'Already redeemed' });
    }

    // Atomically redeem
    const { error: rpcError } = await serviceClient.rpc('redeem_invite_code', {
      p_code: parsed.data.code,
      p_user_id: user.id,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
