'use client';

import { X, Mail, Eye, EyeOff } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations';
import { showToast } from '@/components/ui/Toast';

type AuthView = 'form' | 'confirmEmail' | 'forgotPassword' | 'resetLinkSent' | 'businessPrompt';
type AuthMode = 'signup' | 'signin';

export function AuthModal() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const tFooter = useTranslations('footer');
  const isOpen = useAppStore((s) => s.isAuthModalOpen);
  const authModalMode = useAppStore((s) => s.authModalMode);
  const closeModal = useAppStore((s) => s.closeAuthModal);
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [view, setView] = useState<AuthView>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(authModalMode);
      setView('form');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setInviteCode('');
      setShowPassword(false);
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const checkNewUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_business')
      .eq('id', user.id)
      .single();

    // is_business is null or false for new users who haven't chosen yet
    // Show the prompt only if is_business is still the default (false) and profile was just created
    // We check created_at to determine if this is a brand new user (within last 60 seconds)
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', user.id)
      .single();

    const createdAt = fullProfile?.created_at ? new Date(fullProfile.created_at) : null;
    const isNewUser = createdAt && (Date.now() - createdAt.getTime()) < 60000;

    if (isNewUser && profile?.is_business === false) {
      setView('businessPrompt');
    } else {
      closeModal();
    }
  }, [closeModal]);

  const handleOAuth = useCallback(async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);

    // Validate invite code before OAuth redirect in signup mode
    if (mode === 'signup') {
      if (!inviteCode.trim()) {
        setError(t('inviteCodeRequired'));
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/validate-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode.trim() }),
        });
        const data = await res.json();
        if (!data.valid) {
          setError(t('inviteCodeInvalid'));
          setLoading(false);
          return;
        }
        sessionStorage.setItem('mp_invite_code', inviteCode.trim().toUpperCase());
      } catch {
        setError(t('authError'));
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();
    const redirectTo = mode === 'signup'
      ? `${window.location.origin}/auth/callback?invite_code=${encodeURIComponent(inviteCode.trim().toUpperCase())}`
      : `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }, [mode, inviteCode, t]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = signUpSchema.safeParse({ email: email.trim(), password, confirmPassword, inviteCode: inviteCode.trim() });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      // Validate invite code before creating account
      const validateRes = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const validateData = await validateRes.json();
      if (!validateData.valid) {
        setError(t('inviteCodeInvalid'));
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          setError(t('emailAlreadyRegistered'));
        } else {
          setError(authError.message);
        }
      } else if (data.user && data.user.identities?.length === 0) {
        setError(t('emailAlreadyRegistered'));
      } else {
        // Store invite code for redemption after email confirmation
        sessionStorage.setItem('mp_invite_code', inviteCode.trim().toUpperCase());
        setView('confirmEmail');
      }
    } catch {
      setError(t('authError'));
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, inviteCode, t]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(t('invalidCredentials'));
      } else {
        await checkNewUser();
      }
    } catch {
      setError(t('authError'));
    } finally {
      setLoading(false);
    }
  }, [email, password, t, checkNewUser]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (authError) setError(authError.message);
      else setView('resetLinkSent');
    } catch {
      setError(t('authError'));
    } finally {
      setLoading(false);
    }
  }, [email, t]);

  const handleBusinessChoice = useCallback(async (isBusiness: boolean) => {
    if (isBusiness) {
      closeModal();
      router.push('/business/onboard');
    } else {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ is_business: false }).eq('id', user.id);
      }
      closeModal();
    }
  }, [closeModal, router]);

  if (!isOpen) return null;

  const inputStyle = {
    height: 48,
    backgroundColor: 'var(--bg-elevated)',
    borderColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => { if (e.target === backdropRef.current) closeModal(); }}
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
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)' }}
          aria-label={tCommon('close')}
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* Business prompt for new users */}
        {view === 'businessPrompt' && (
          <div className="text-center">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>
              Welcome to meal.photos!
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Are you a food business looking to showcase your dishes?
            </p>
            <button
              type="button"
              onClick={() => handleBusinessChoice(true)}
              className="w-full flex items-center justify-center rounded-full transition-opacity"
              style={{
                height: 48,
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Yes, I&apos;m a business
            </button>
            <button
              type="button"
              onClick={() => handleBusinessChoice(false)}
              className="w-full flex items-center justify-center rounded-full transition-opacity"
              style={{
                height: 48,
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 500,
                border: '1px solid var(--bg-elevated)',
              }}
            >
              I'm here to eat
            </button>
          </div>
        )}

        {view === 'confirmEmail' && (
          <ConfirmEmailView email={email} onBack={() => { setView('form'); setMode('signin'); }} />
        )}

        {(view === 'forgotPassword' || view === 'resetLinkSent') && (
          <ForgotPasswordView
            email={email}
            setEmail={setEmail}
            loading={loading}
            error={error}
            linkSent={view === 'resetLinkSent'}
            onSubmit={handleForgotPassword}
            onBack={() => { setView('form'); setError(null); }}
          />
        )}

        {view === 'form' && (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--accent-primary)', marginBottom: 8 }}>
              {mode === 'signup' ? t('joinTitle') : t('welcomeBack')}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)', marginBottom: 24 }}>
              {mode === 'signup' ? t('signupDesc') : t('signinDesc')}
            </p>

            {error && (
              <div className="mb-4 rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(212, 85, 58, 0.15)', color: 'var(--status-error)', fontSize: 14, fontFamily: 'var(--font-body)' }}>
                {error}
              </div>
            )}

            {/* Invite code field shown above OAuth buttons in signup mode */}
            {mode === 'signup' && (
              <div className="mb-4">
                <label htmlFor="auth-invite-code-top" className="mb-1 block" style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                  {t('inviteCodeLabel')}
                </label>
                <input
                  id="auth-invite-code-top"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t('inviteCodePlaceholder')}
                  required
                  disabled={loading}
                  autoComplete="off"
                  maxLength={20}
                  className="w-full rounded-xl border px-4 outline-none transition-colors focus:border-(--accent-primary)"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Google OAuth - hidden for now */}
            {/* Apple OAuth - hidden for now */}
            {/* Divider - hidden while OAuth buttons are hidden */}

            {/* Email/password form */}
            <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} autoComplete="on">
              <label htmlFor="auth-email" className="mb-1 block" style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                {t('emailLabel')}
              </label>
              <input
                id="auth-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                required
                disabled={loading}
                autoComplete="email"
                className="mb-3 w-full rounded-xl border px-4 outline-none transition-colors focus:border-(--accent-primary)"
                style={inputStyle}
              />

              <label htmlFor="auth-password" className="mb-1 block" style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                {t('passwordLabel')}
              </label>
              <div className="relative mb-3">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? t('passwordPlaceholder') : ''}
                  required
                  disabled={loading}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full rounded-xl border px-4 pr-12 outline-none transition-colors focus:border-(--accent-primary)"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </button>
              </div>

              {mode === 'signup' && (
                <>
                  <label htmlFor="auth-confirm-password" className="mb-1 block" style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
                    {t('confirmPasswordLabel')}
                  </label>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    name="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className="mb-3 w-full rounded-xl border px-4 outline-none transition-colors focus:border-(--accent-primary)"
                    style={inputStyle}
                  />

                </>
              )}

              {mode === 'signin' && (
                <div className="mb-3 text-right">
                  <button type="button" onClick={() => { setView('forgotPassword'); setError(null); }} style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                    {t('forgotPassword')}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl transition-opacity disabled:opacity-50"
                style={{ height: 48, backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600 }}
              >
                {mode === 'signup' ? t('signUpButton') : t('signInButton')}
              </button>
            </form>

            <p className="mt-4 text-center" style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
              {mode === 'signup' ? t('alreadyHaveAccount') : t('dontHaveAccount')}
              <button
                onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); setPassword(''); setConfirmPassword(''); }}
                className="underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {mode === 'signup' ? t('signIn') : t('signUp')}
              </button>
            </p>

            <p className="mt-3 text-center" style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('legalFooter')}{' '}
              <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{tFooter('terms')}</a>{' '}
              {tCommon('and')}{' '}
              <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{tFooter('privacy')}</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmEmailView({ email, onBack }: { email: string; onBack: () => void }) {
  const t = useTranslations('auth');
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex items-center justify-center rounded-full" style={{ width: 56, height: 56, backgroundColor: 'rgba(232, 168, 56, 0.15)' }}>
        <Mail size={28} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginBottom: 8 }}>
        {t('confirmEmail')}
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
        <span style={{ color: 'var(--text-primary)' }}>{email}</span>
      </p>
      <button onClick={onBack} className="underline" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
        {t('backToSignIn')}
      </button>
    </div>
  );
}

function ForgotPasswordView({ email, setEmail, loading, error, linkSent, onSubmit, onBack }: {
  email: string; setEmail: (v: string) => void; loading: boolean; error: string | null; linkSent: boolean; onSubmit: (e: React.FormEvent) => void; onBack: () => void;
}) {
  const t = useTranslations('auth');
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent-primary)', marginBottom: 8 }}>
        {t('resetPasswordTitle')}
      </h2>
      {linkSent ? (
        <div className="text-center">
          <div className="mx-auto mb-4 mt-4 flex items-center justify-center rounded-full" style={{ width: 56, height: 56, backgroundColor: 'rgba(232, 168, 56, 0.15)' }}>
            <Mail size={28} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t('resetLinkSent')}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t('resetPasswordDesc')}
          </p>
          {error && (
            <div className="mb-4 rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(212, 85, 58, 0.15)', color: 'var(--status-error)', fontSize: 14, fontFamily: 'var(--font-body)' }}>
              {error}
            </div>
          )}
          <form onSubmit={onSubmit}>
            <input
              type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')} required disabled={loading} autoComplete="email"
              className="mb-3 w-full rounded-xl border px-4 outline-none transition-colors focus:border-(--accent-primary)"
              style={{ height: 48, backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--bg-elevated)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: 15 }}
            />
            <button
              type="submit" disabled={loading || !email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl transition-opacity disabled:opacity-50"
              style={{ height: 48, backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600 }}
            >
              <Mail size={18} strokeWidth={1.5} />
              {t('sendResetLink')}
            </button>
          </form>
        </>
      )}
      <div className="mt-4 text-center">
        <button onClick={onBack} className="underline" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          {t('backToSignIn')}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
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
