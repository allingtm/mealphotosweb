import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { locales, defaultLocale, type Locale } from '@/i18n/routing';

const ALLOWED_ORIGINS = [
  'https://meal.photos',
  'https://www.meal.photos',
];

if (process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
}

function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang] = part.trim().split(';');
      return lang.trim().substring(0, 2).toLowerCase();
    });
  for (const lang of preferred) {
    if (locales.includes(lang as Locale)) return lang as Locale;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  // CSRF protection: validate Origin header on state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }
  }

  // Refresh Supabase auth session cookies
  const response = await updateSession(request);

  // Locale detection — set cookie if not already present
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (!cookieLocale || !locales.includes(cookieLocale as Locale)) {
    const detected = negotiateLocale(request.headers.get('accept-language'));
    response.cookies.set('NEXT_LOCALE', detected, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
