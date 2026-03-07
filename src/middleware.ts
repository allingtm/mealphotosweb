import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { locales, defaultLocale, type Locale } from '@/i18n/routing';

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

export async function middleware(request: NextRequest) {
  // 1. Supabase session refresh
  const response = await updateSession(request);

  // 2. Locale detection — set cookie if not already present
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
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
