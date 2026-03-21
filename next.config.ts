import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import bundleAnalyzer from '@next/bundle-analyzer';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'imagedelivery.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // unsafe-inline: required by Next.js inline scripts + Cloudflare Turnstile
              // unsafe-eval: required by OneSignal SDK — remove when they support nonce-based CSP
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://cdn.onesignal.com",
              // unsafe-inline for styles: required by Next.js / Tailwind CSS
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://imagedelivery.net https://api.mapbox.com https://lh3.googleusercontent.com https://*.googleusercontent.com data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://challenges.cloudflare.com https://onesignal.com https://*.posthog.com",
              "font-src 'self'",
              "frame-src https://challenges.cloudflare.com https://js.stripe.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
