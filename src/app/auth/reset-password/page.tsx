'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/validations';
import { showToast } from '@/components/ui/Toast';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = updatePasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });

      if (authError) {
        setError(authError.message);
      } else {
        showToast(t('passwordUpdated'), 'success');
        router.push('/feed');
      }
    } catch {
      setError(t('authError'));
    } finally {
      setLoading(false);
    }
  };

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
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            backgroundColor: 'rgba(232, 168, 56, 0.15)',
          }}
        >
          <Lock size={28} strokeWidth={1.5} style={{ color: 'var(--accent-primary)' }} />
        </div>

        <h1
          className="mb-2 text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent-primary)',
          }}
        >
          {t('setNewPasswordTitle')}
        </h1>

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

        <form onSubmit={handleSubmit} autoComplete="on">
          {/* New password */}
          <label
            htmlFor="new-password"
            className="mb-1 block"
            style={{
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
            }}
          >
            {t('newPassword')}
          </label>
          <div className="relative mb-3">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              name="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
              disabled={loading}
              autoComplete="new-password"
              className="w-full rounded-xl border px-4 pr-12 outline-none transition-colors focus:border-[var(--accent-primary)]"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff size={20} strokeWidth={1.5} />
              ) : (
                <Eye size={20} strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Confirm password */}
          <label
            htmlFor="confirm-new-password"
            className="mb-1 block"
            style={{
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-secondary)',
            }}
          >
            {t('confirmNewPassword')}
          </label>
          <input
            id="confirm-new-password"
            type={showPassword ? 'text' : 'password'}
            name="confirm-new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
            className="mb-4 w-full rounded-xl border px-4 outline-none transition-colors focus:border-[var(--accent-primary)]"
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
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
            <Lock size={18} strokeWidth={1.5} />
            {t('updatePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
