'use client';

import { Camera } from 'lucide-react';
import Link from 'next/link';

export function UploadFAB() {
  return (
    <Link
      href="/upload"
      className="flex items-center justify-center rounded-full"
      style={{
        width: 56,
        height: 56,
        backgroundColor: 'var(--accent-primary)',
      }}
    >
      <Camera size={24} strokeWidth={1.5} color="#121212" />
    </Link>
  );
}
