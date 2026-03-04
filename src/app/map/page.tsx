'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MapView = dynamic(
  () => import('@/components/map/MapView'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center w-full"
        style={{
          height: 'calc(100dvh - 56px)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <Loader2
          size={32}
          strokeWidth={1.5}
          className="animate-spin"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>
    ),
  }
);

export default function MapPage() {
  return <MapView />;
}
