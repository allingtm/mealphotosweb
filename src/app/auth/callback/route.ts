import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const inviteCode = searchParams.get('invite_code');
  const rawNext = searchParams.get('next') ?? '/';
  // Prevent open redirect — only allow relative paths, block protocol-relative URLs
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      // Redeem invite code for email confirmation flow
      if (inviteCode) {
        await redeemInviteCode(inviteCode, supabase);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      // Redeem invite code for OAuth flow
      if (inviteCode) {
        await redeemInviteCode(inviteCode, supabase);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}

async function redeemInviteCode(
  inviteCode: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const serviceClient = createServiceRoleClient();

    // Check if already redeemed
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('invite_code_id')
      .eq('id', user.id)
      .single();

    if (profile?.invite_code_id) return;

    await serviceClient.rpc('redeem_invite_code', {
      p_code: inviteCode,
      p_user_id: user.id,
    });
  } catch {
    // Non-blocking — client-side will retry via sessionStorage
  }
}
