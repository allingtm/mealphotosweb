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
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 md:-mx-[var(--layout-gap)]" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col h-[calc(100dvh-56px-3.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-56px-36px)]">
        <MapView />
      </div>
    </div>
  );
}
