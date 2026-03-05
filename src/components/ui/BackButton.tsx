'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center justify-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'rgba(18, 18, 18, 0.5)',
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label="Go back"
    >
      <ArrowLeft
        size={24}
        strokeWidth={1.5}
        color="var(--text-primary)"
      />
    </button>
  );
}
