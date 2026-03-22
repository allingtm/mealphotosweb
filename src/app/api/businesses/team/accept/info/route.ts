import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';

// GET /api/businesses/team/accept/info?token=xxx — get invite info (public, no auth required)
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimited = await applyRateLimit(ip, 'read');
  if (rateLimited) return rateLimited;

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const serviceClient = createServiceRoleClient();

  const { data: invite } = await serviceClient
    .from('business_team_invites')
    .select('id, business_id, status, expires_at')
    .eq('token', token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'This invite has already been used or revoked', expired: true }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired', expired: true }, { status: 410 });
  }

  // Get business name
  const { data: bizProfile } = await serviceClient
    .from('business_profiles')
    .select('business_name')
    .eq('id', invite.business_id)
    .single();

  return NextResponse.json({
    business_name: bizProfile?.business_name ?? 'A business',
    business_id: invite.business_id,
  });
}
