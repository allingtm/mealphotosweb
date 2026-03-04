import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — meal.photos',
  description:
    'How meal.photos collects, uses, and protects your personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="last-updated">Last updated: [DATE]</p>

      <h2>1. Introduction</h2>
      <p>
        TODO: Introduction paragraph about meal.photos, UK-based data
        controller, GDPR compliance.
      </p>

      <h2>2. Data We Collect</h2>
      <p>
        TODO: List of data collected — account info (email, display name,
        avatar), uploaded photos, ratings, location (city-level, quantised),
        device info.
      </p>

      <h2>3. How We Use Your Data</h2>
      <p>
        TODO: Purposes — providing the service, showing meals on the map,
        personalising the feed, analytics, communication.
      </p>

      <h2>4. Third-Party Services</h2>
      <p>
        TODO: Explain that we share data with the following third-party services
        only as needed to operate the platform:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — Database and authentication (EU/UK region)
        </li>
        <li>
          <strong>Cloudflare Images</strong> — Image storage and CDN delivery
        </li>
        <li>
          <strong>Stripe</strong> — Payment processing (restaurant subscriptions
          only)
        </li>
        <li>
          <strong>Mapbox</strong> — Map rendering
        </li>
        <li>
          <strong>Resend</strong> — Transactional email delivery
        </li>
        <li>
          <strong>OneSignal</strong> — Web push notifications
        </li>
        <li>
          <strong>Upstash</strong> — Rate limiting
        </li>
        <li>
          <strong>PostHog</strong> — Analytics (only with consent)
        </li>
        <li>
          <strong>Google Cloud Vision</strong> — Content moderation
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> — Bot protection
        </li>
        <li>
          <strong>Vercel</strong> — Hosting and edge delivery
        </li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        TODO: Explain cookie categories — essential (auth session) and analytics
        (PostHog). Default to declining non-essential. How to manage preferences.
      </p>

      <h2>6. Location Data</h2>
      <p>
        TODO: Explain that coordinates are quantised to 2 decimal places
        (~1.1km), EXIF data is stripped from photos, exact location is never
        stored.
      </p>

      <h2>7. Your Rights (UK GDPR)</h2>
      <p>
        TODO: Right of access, right to rectification, right to erasure (account
        deletion), right to data portability (data export), right to restrict
        processing, right to object.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        TODO: How long data is kept, what happens on account deletion.
      </p>

      <h2>9. Children</h2>
      <p>TODO: Service not intended for users under 13.</p>

      <h2>10. Changes to This Policy</h2>
      <p>TODO: How users will be notified of changes.</p>

      <h2>11. Contact</h2>
      <p>TODO: Contact email for data protection queries.</p>
    </>
  );
}
