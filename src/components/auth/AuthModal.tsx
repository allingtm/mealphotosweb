'use client';

import { X, Mail } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

type AuthMode = 'signup' | 'signin';

export function AuthModal() {
  const isOpen = useAppStore((s) => s.isAuthModalOpen);
  const closeModal = useAppStore((s) => s.closeAuthModal);

  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('signup');
      setEmail('');
      setLoading(false);
      setMagicLinkSent(false);
      setError(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeModal]);

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

  const handleOAuth = useCallback(
    async (provider: 'google' | 'apple') => {
      setError(null);
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
          },
        });
        if (error) setError(error.message);
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;
      setError(null);
      setLoading(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
          },
        });
        if (error) {
          setError(error.message);
        } else {
          setMagicLinkSent(true);
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) closeModal();
      }}
    >
      <div
        className="relative w-full max-w-lg animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderTopLeftRadius: 'var(--radius-modal)',
          borderTopRightRadius: 'var(--radius-modal)',
          padding: '32px 24px 40px',
        }}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {magicLinkSent ? (
          <MagicLinkSentView email={email} onBack={() => setMagicLinkSent(false)} />
        ) : (
          <>
            {/* Heading */}
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--accent-primary)',
                marginBottom: 8,
              }}
            >
              {mode === 'signup' ? 'Join meal.photos' : 'Welcome back'}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                color: 'var(--text-primary)',
                marginBottom: 24,
              }}
            >
              {mode === 'signup'
                ? 'Sign up to upload meals, save recipes, and track your streak.'
                : 'Sign in to your account.'}
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

            {/* Google OAuth */}
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl transition-opacity disabled:opacity-50"
              style={{
                height: 48,
                backgroundColor: '#FFFFFF',
                color: '#1F1F1F',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Apple OAuth */}
            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl transition-opacity disabled:opacity-50"
              style={{
                height: 48,
                backgroundColor: '#000000',
                color: '#FFFFFF',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <AppleIcon />
              Continue with Apple
            </button>

            {/* Divider */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--bg-elevated)' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontFamily: 'var(--font-body)' }}>
                or
              </span>
              <div className="flex-1" style={{ height: 1, backgroundColor: 'var(--bg-elevated)' }} />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleMagicLink}>
              <label
                htmlFor="auth-email"
                className="mb-1 block"
                style={{
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                }}
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
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
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl transition-opacity disabled:opacity-50"
                style={{
                  height: 48,
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                <Mail size={18} strokeWidth={1.5} />
                Send Magic Link
              </button>
            </form>

            {/* Toggle mode */}
            <p
              className="mt-4 text-center"
              style={{
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                color: 'var(--text-secondary)',
              }}
            >
              {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                className="underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function MagicLinkSentView({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-4 flex items-center justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: 'rgba(232, 168, 56, 0.15)',
        }}
      >
        <Mail size={28} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Check your email
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 24,
        }}
      >
        We sent a magic link to{' '}
        <span style={{ color: 'var(--text-primary)' }}>{email}</span>. Click it to sign in.
      </p>
      <button
        onClick={onBack}
        className="underline"
        style={{
          color: 'var(--accent-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
        }}
      >
        Try a different method
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 22" fill="currentColor">
      <path d="M14.94 11.58c-.02-2.17 1.77-3.21 1.85-3.26-1.01-1.47-2.57-1.67-3.13-1.7-1.33-.14-2.6.79-3.27.79-.68 0-1.72-.77-2.83-.75-1.46.02-2.8.85-3.55 2.15-1.52 2.63-.39 6.52 1.09 8.66.72 1.05 1.59 2.22 2.72 2.18 1.09-.04 1.5-.71 2.82-.71 1.31 0 1.69.71 2.83.69 1.18-.02 1.93-1.06 2.64-2.11.83-1.21 1.17-2.39 1.19-2.45-.03-.01-2.29-.88-2.31-3.49h-.05zM12.76 4.92c.6-.73 1.01-1.73.9-2.74-.87.04-1.92.58-2.54 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.23z" />
    </svg>
  );
}
