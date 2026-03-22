'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function TeamJoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch invite info
  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      setLoading(false);
      return;
    }

    async function fetchInfo() {
      try {
        const res = await fetch(`/api/businesses/team/accept/info?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Invalid invite');
          setLoading(false);
          return;
        }
        setBusinessName(data.business_name);
      } catch {
        setError('Failed to load invite details');
      } finally {
        setLoading(false);
      }
    }

    fetchInfo();
  }, [token]);

  async function handleAccept() {
    if (!token || !termsAccepted) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch('/api/businesses/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, terms_accepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to accept invite');
        setAccepting(false);
        return;
      }
      setSuccess(true);
      // Redirect to dashboard after a brief moment
      setTimeout(() => {
        router.push('/me');
        router.refresh();
      }, 2000);
    } catch {
      setError('Failed to accept invite');
      setAccepting(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 24,
          padding: '32px 24px',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
              Loading invite...
            </p>
          </div>
        ) : error && !businessName ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle size={32} style={{ color: 'var(--status-error)' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--status-error)', textAlign: 'center' }}>
              {error}
            </p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 size={32} style={{ color: 'var(--status-success)' }} />
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--text-primary)',
                textAlign: 'center',
              }}
            >
              You&apos;re in!
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              You&apos;ve joined <strong style={{ color: 'var(--text-primary)' }}>{businessName}</strong>. Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          <>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: 'var(--text-primary)',
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Team Invite
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>{businessName}</strong> has invited you to join their team on meal.photos.
            </p>

            {!user ? (
              <div className="flex flex-col items-center gap-4">
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  You need to sign in or create an account first.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="w-full py-3 rounded-2xl"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--primary-foreground)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    className="rounded-2xl px-4 py-3 mb-4"
                    style={{ backgroundColor: 'rgba(212, 85, 58, 0.1)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--status-error)' }}
                  >
                    {error}
                  </div>
                )}

                {/* T&C checkbox */}
                <label
                  className="flex items-start gap-3 mb-6 cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}
                >
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 shrink-0"
                    style={{ accentColor: 'var(--accent-primary)', width: 18, height: 18 }}
                  />
                  <span>
                    I agree to the meal.photos{' '}
                    <a href="/legal/terms" target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                      Terms &amp; Conditions
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                      Privacy Policy
                    </a>
                    , and I agree to follow the terms and privacy policy of{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{businessName}</strong>.
                    You can request these from the business owner.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={!termsAccepted || accepting}
                  className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: termsAccepted ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: termsAccepted ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    fontWeight: 600,
                    border: 'none',
                    cursor: termsAccepted && !accepting ? 'pointer' : 'not-allowed',
                    opacity: accepting ? 0.6 : 1,
                  }}
                >
                  {accepting && <Loader2 size={18} className="animate-spin" />}
                  Accept Invite
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
