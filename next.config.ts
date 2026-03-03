import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://cdn.onesignal.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://imagedelivery.net https://api.mapbox.com data: blob:",
              "connect-src 'self' https://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://challenges.cloudflare.com https://onesignal.com https://app.posthog.com",
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

export default nextConfig;
