'use client';

import { Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';

export function UploadFAB() {
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const handleClick = async () => {
    await requireAuth();
    router.push('/upload');
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center rounded-full"
      style={{
        width: 56,
        height: 56,
        backgroundColor: 'var(--accent-primary)',
      }}
      aria-label="Upload meal photo"
    >
      <Camera size={24} strokeWidth={1.5} color="#121212" />
    </button>
  );
}
