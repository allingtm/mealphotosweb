'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { showToast } from '@/components/ui/Toast';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      getResponse: (widgetId: string) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function ContactForm() {
  const t = useTranslations('contact');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Render invisible Turnstile widget
    const interval = setInterval(() => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: SITE_KEY,
          size: 'invisible',
          callback: () => {},
        });
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      // Get turnstile token
      let turnstileToken = '';
      if (process.env.NODE_ENV === 'development') {
        turnstileToken = 'dev-bypass';
      } else if (widgetIdRef.current && window.turnstile) {
        turnstileToken = window.turnstile.getResponse(widgetIdRef.current) ?? '';
      }

      if (!turnstileToken && process.env.NODE_ENV !== 'development') {
        showToast('Bot verification failed. Please try again.', 'error');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || undefined,
            email,
            subject: subject || undefined,
            message,
            turnstile_token: turnstileToken,
            website: website || undefined,
          }),
        });

        if (res.ok) {
          showToast(t('successMessage'), 'success');
          setSubmitted(true);
          setName('');
          setEmail('');
          setSubject('');
          setMessage('');
        } else if (res.status === 429) {
          showToast('Too many requests. Please try again later.', 'error');
        } else {
          const data = await res.json().catch(() => null);
          showToast(data?.error ?? t('errorMessage'), 'error');
        }

        // Reset turnstile for next submission
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } catch {
        showToast(t('errorMessage'), 'error');
      } finally {
        setLoading(false);
      }
    },
    [name, email, subject, message, website, loading, t]
  );

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: '48px 24px', textAlign: 'center' }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'var(--status-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          {t('successMessage')}
        </h2>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          style={{
            marginTop: 16,
            padding: '10px 24px',
            borderRadius: 16,
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 500,
            border: '1px solid var(--bg-elevated)',
            cursor: 'pointer',
          }}
        >
          {t('sendAnother')}
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 16,
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 8,
        }}
      >
        {t('description')}
      </p>

      {/* Honeypot — hidden from real users */}
      <div
        style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contact-name" style={labelStyle}>
          {t('nameLabel')}
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-email" style={labelStyle}>
          {t('emailLabel')} *
        </label>
        <input
          id="contact-email"
          type="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-subject" style={labelStyle}>
          {t('subjectLabel')}
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder={t('subjectPlaceholder')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-message" style={labelStyle}>
          {t('messageLabel')} *
        </label>
        <textarea
          id="contact-message"
          placeholder={t('messagePlaceholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          style={{
            ...inputStyle,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Invisible Turnstile widget */}
      <div ref={turnstileRef} />

      <button
        type="submit"
        disabled={loading || !email || message.length < 10}
        style={{
          padding: '14px 24px',
          borderRadius: 16,
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--primary-foreground)',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 600,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading || !email || message.length < 10 ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {loading ? t('sending') : t('submit')}
      </button>
    </form>
  );
}
