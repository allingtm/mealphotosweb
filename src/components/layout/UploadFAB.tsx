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
      className="flex items-center justify-center rounded-full transition-transform active:scale-95"
      style={{
        width: 56,
        height: 56,
        backgroundColor: 'var(--bg-surface)',
        border: '2px solid var(--accent-primary)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      aria-label={t('uploadMealPhoto')}
    >
      <Camera size={24} strokeWidth={1.5} color="var(--accent-primary)" />
    </button>
  );
}
