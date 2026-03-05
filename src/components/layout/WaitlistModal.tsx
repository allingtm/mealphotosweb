'use client';

import { X, Sparkles, PartyPopper } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { waitlistSchema } from '@/lib/validations';

const STORAGE_KEY = 'mp_waitlist_shown';

type ModalState = 'form' | 'submitting' | 'success';

export function WaitlistModal() {
  const t = useTranslations('waitlist');
  const tCommon = useTranslations('common');
  const isOpen = useAppStore((s) => s.isWaitlistModalOpen);
  const showModal = useAppStore((s) => s.showWaitlistModal);
  const hideModal = useAppStore((s) => s.hideWaitlistModal);
  const isCookieBannerVisible = useAppStore((s) => s.isCookieBannerVisible);

  const [state, setState] = useState<ModalState>('form');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  // Show modal on first visit, after cookie banner is dismissed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    // If cookie banner is still visible, wait for it to be dismissed
    if (isCookieBannerVisible) return;

    const timer = setTimeout(() => {
      showModal();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isCookieBannerVisible, showModal]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    hideModal();
  }, [hideModal]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = waitlistSchema.safeParse({ first_name: firstName, email });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = fieldErrors.first_name?.[0] || fieldErrors.email?.[0];
      setError(firstError || t('errorGeneric'));
      return;
    }

    setState('submitting');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: parsed.data.first_name, email: parsed.data.email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || t('errorGeneric'));
        setState('form');
        return;
      }

      setSubmittedName(parsed.data.first_name);
      setState('success');
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch { /* ignore */ }
    } catch {
      setError(t('errorGeneric'));
      setState('form');
    }
  }, [firstName, email, t]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) dismiss();
      }}
    >
      <div
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-modal)',
          padding: '32px 24px',
        }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
          }}
          aria-label={tCommon('close')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {state === 'success' ? (
          <div className="text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-full"
              style={{
                width: 56,
                height: 56,
                backgroundColor: 'rgba(232, 168, 56, 0.15)',
              }}
            >
              <PartyPopper size={28} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 24,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              {t('successHeading')}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--text-secondary)',
                marginBottom: 24,
              }}
            >
              {t('successMessage', { name: submittedName })}
            </p>
            <button
              onClick={dismiss}
              className="w-full rounded-xl transition-opacity"
              style={{
                height: 48,
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              {t('successDismiss')}
            </button>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div
              className="mb-4 flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: 'rgba(232, 168, 56, 0.15)',
              }}
            >
              <Sparkles size={24} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
            </div>

            {/* Heading */}
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--accent-primary)',
                marginBottom: 8,
              }}
            >
              {t('heading')}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              {t('message')}
            </p>

            {/* Error */}
            {error && (
              <div
                className="mb-4 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: 'rgba(212, 85, 58, 0.15)',
                  color: 'var(--status-error)',
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="waitlist-name"
                className="mb-1 block"
                style={{
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('firstNameLabel')}
              </label>
              <input
                id="waitlist-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
                required
                disabled={state === 'submitting'}
                className="mb-3 w-full rounded-xl border px-4 outline-none transition-colors focus:border-[var(--accent-primary)]"
                style={{
                  height: 48,
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                }}
              />

              <label
                htmlFor="waitlist-email"
                className="mb-1 block"
                style={{
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('emailLabel')}
              </label>
              <input
                id="waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
                disabled={state === 'submitting'}
                className="mb-4 w-full rounded-xl border px-4 outline-none transition-colors focus:border-[var(--accent-primary)]"
                style={{
                  height: 48,
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                }}
              />

              <button
                type="submit"
                disabled={state === 'submitting' || !firstName.trim() || !email.trim()}
                className="w-full rounded-xl transition-opacity disabled:opacity-50"
                style={{
                  height: 48,
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {state === 'submitting' ? t('submitting') : t('submit')}
              </button>
            </form>

            {/* No thanks */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={dismiss}
                className="underline"
                style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  textUnderlineOffset: 2,
                }}
              >
                {t('noThanks')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
