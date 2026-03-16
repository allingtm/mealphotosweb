'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MapView = dynamic(
  () => import('@/components/map/MapView'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center w-full flex-1"
        style={{ backgroundColor: 'var(--bg-primary)' }}
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
  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0" style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col h-[calc(100dvh-56px)] md:h-full md:flex-1" style={{ maxWidth: 960, margin: '0 auto' }}>
        <MapView />
      </div>
    </div>
  );
}
