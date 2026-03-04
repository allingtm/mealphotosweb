'use client';

import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

export function UploadFAB() {
  const router = useRouter();
  const t = useTranslations('nav');
  const requireAuth = useRequireAuth();

  const handleClick = async () => {
    try {
      await requireAuth();
    } catch {
      return; // Auth was dismissed
    }
    router.push('/upload');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed z-50 flex items-center justify-center rounded-full transition-transform active:scale-95 md:hidden"
      style={{
        width: 64,
        height: 64,
        backgroundColor: 'var(--accent-primary)',
        boxShadow: '0 4px 16px rgba(232, 168, 56, 0.3)',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      aria-label={t('uploadMealPhoto')}
    >
      <Camera size={28} strokeWidth={1.5} color="var(--bg-primary)" />
    </button>
  );
}
