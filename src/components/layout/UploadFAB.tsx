'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppStore } from '@/lib/store';

export function UploadFAB() {
  const router = useRouter();
  const t = useTranslations('nav');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    const { user, openAuthModal } = useAppStore.getState();
    if (!user) {
      openAuthModal();
      // After auth completes, user can tap the FAB again
      return;
    }
    // Trigger native file picker directly in user gesture context
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = '';
    useAppStore.getState().setPendingUploadFile(file);
    router.push('/upload');
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={t('uploadMealPhoto')}
      />
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
    </>
  );
}
