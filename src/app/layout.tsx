import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, DM_Sans, Geist } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { OneSignalProvider } from '@/components/providers/OneSignalProvider';
import { AppShell } from '@/components/layout/AppShell';
import { ToastContainer } from '@/components/ui/Toast';
import { CookieConsentBanner } from '@/components/layout/CookieConsentBanner';
import '@/styles/globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://meal.photos'),
  title: {
    default: 'meal.photos — See what\'s being served right now',
    template: '%s | meal.photos',
  },
  description:
    'A live food feed from restaurants, cafes, and food businesses near you. Discover dishes, save favourites, and explore food culture worldwide.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'meal.photos',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'meal.photos — See what\'s being served right now',
    description:
      'A live food feed from restaurants, cafes, and food businesses near you. Discover dishes, save favourites, and explore food culture worldwide.',
    siteName: 'meal.photos',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'meal.photos — See what\'s being served right now',
    description:
      'A live food feed from restaurants, cafes, and food businesses near you.',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(instrumentSerif.variable, dmSans.variable, "font-sans", geist.variable)}
    >
      <body
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Organization + WebSite structured data for AEO/GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'meal.photos',
              url: 'https://meal.photos',
              logo: 'https://meal.photos/icons/icon-512.png',
              description:
                'A global stage for food culture. Upload meals, get community ratings, discover restaurants worldwide.',
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'meal.photos',
              url: 'https://meal.photos',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://meal.photos/explore/{search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-(--accent-primary) focus:text-(--bg-primary) focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <NextIntlClientProvider messages={messages}>
          <PostHogProvider>
            <AuthProvider>
              <OneSignalProvider />
              <AppShell>{children}</AppShell>
              <ToastContainer />
              <CookieConsentBanner />
            </AuthProvider>
          </PostHogProvider>
        </NextIntlClientProvider>
        <SpeedInsights />
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }`}
        </Script>
      </body>
    </html>
  );
}
