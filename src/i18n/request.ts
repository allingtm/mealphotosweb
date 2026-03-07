import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './routing';

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

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
  const locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : negotiateLocale(headerStore.get('accept-language'));

  const messages = (await import(`../locales/${locale}.json`)).default;

  return { locale, messages };
});
