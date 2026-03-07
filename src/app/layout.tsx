import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, DM_Sans } from 'next/font/google';
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
import { WaitlistModal } from '@/components/layout/WaitlistModal';
import '@/styles/globals.css';

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
  title: 'meal.photos — Rate Real Meals',
  description:
    'Upload your meals and let the world rate them. Share privately with your nutritionist or PT. Get your business discovered by people who love food.',
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
    title: 'meal.photos — A global stage for food culture',
    description:
      'Upload your meals and let the world rate them. Share privately with your nutritionist or PT. Get your business discovered by people who love food.',
    siteName: 'meal.photos',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'meal.photos — A global stage for food culture',
    description:
      'Upload your meals and let the world rate them. Share privately with your nutritionist or PT. Get your business discovered by people who love food.',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
      className={`${instrumentSerif.variable} ${dmSans.variable}`}
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
              <WaitlistModal />
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
