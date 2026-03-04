'use client';

import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

export default function CookiePolicyPage() {
  const t = useTranslations('cookies');
  const showCookieBanner = useAppStore((s) => s.showCookieBanner);
  const openCookiePreferences = useAppStore((s) => s.openCookiePreferences);

  return (
    <>
      <h1>{t('policyTitle')}</h1>
      <p className="last-updated">Last updated: [DATE]</p>

      <h2>1. What Are Cookies</h2>
      <p>
        TODO: Explain what cookies are — small text files stored on your device
        by websites you visit. They help sites remember your preferences and
        understand how you use the service.
      </p>

      <h2>2. Essential Cookies</h2>
      <p>
        TODO: These cookies are strictly necessary for the app to function. They
        cannot be disabled.
      </p>
      <ul>
        <li>
          <strong>Authentication session</strong> — Supabase uses cookies to
          keep you signed in securely.
        </li>
        <li>
          <strong>Bot protection</strong> — Cloudflare Turnstile uses cookies to
          verify you are a real person, not a bot.
        </li>
      </ul>

      <h2>3. Analytics Cookies</h2>
      <p>
        TODO: These cookies are only set if you give consent. They help us
        understand how people use the app so we can improve it.
      </p>
      <ul>
        <li>
          <strong>PostHog</strong> — Collects anonymous usage data such as pages
          visited and features used. No personal data is shared. You can opt out
          at any time.
        </li>
      </ul>

      <h2>4. How to Manage Your Cookies</h2>
      <p>
        You can change your cookie preferences at any time using the button
        below, or through the Settings page. You can also clear cookies through
        your browser settings.
      </p>
      <button
        type="button"
        onClick={() => {
          showCookieBanner();
          openCookiePreferences();
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 24px',
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        {t('manageCookieSettings')}
      </button>

      <h2>5. Changes to This Policy</h2>
      <p>
        TODO: How users will be notified of changes to the cookie policy.
      </p>

      <h2>6. Contact</h2>
      <p>TODO: Contact email for cookie-related queries.</p>
    </>
  );
}
