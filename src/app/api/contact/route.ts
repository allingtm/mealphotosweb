import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { applyRateLimit } from '@/lib/rate-limit';
import { contactSubmissionSchema } from '@/lib/validations/contact';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    // 1. Extract IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // 2. Rate limit by IP (3/min)
    const rateLimited = await applyRateLimit(ip, 'contact');
    if (rateLimited) return rateLimited;

    // 3. Parse and validate body
    const body = await req.json();
    const parsed = contactSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message, turnstile_token, website } = parsed.data;

    // 4. Honeypot check — silently accept to not tip off bots
    if (website) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // 5. Validate Turnstile token
    const isDevBypass = process.env.NODE_ENV === 'development' && turnstile_token === 'dev-bypass';
    if (TURNSTILE_SECRET && !isDevBypass) {
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

    // 6. Hash IP for storage (no raw PII)
    const ipHash = createHash('sha256').update(ip).digest('hex');

    // 7. Insert into database
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.from('contact_submissions').insert({
      name: name || null,
      email,
      subject: subject || null,
      message,
      ip_hash: ipHash,
    });

    if (error) {
      console.error('Contact submission insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
