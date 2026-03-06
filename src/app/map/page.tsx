'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, Map, List } from 'lucide-react';
import { AppBar } from '@/components/layout/AppBar';
import { DiscoverClient } from '@/components/discover/DiscoverClient';

const MapView = dynamic(
  () => import('@/components/map/MapView'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center w-full flex-1"
        style={{
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
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'list' ? 'list' : 'map';
  const [view, setView] = useState<'map' | 'list'>(initialView);

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-full md:flex-1">
      <AppBar
        rightAction={
          <button
            type="button"
            onClick={() => setView(view === 'map' ? 'list' : 'map')}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--bg-elevated)',
            }}
            aria-label={view === 'map' ? 'Switch to list view' : 'Switch to map view'}
          >
            {view === 'map' ? (
              <List size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
            ) : (
              <Map size={18} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
            )}
          </button>
        }
      />
      {view === 'map' ? <MapView /> : <DiscoverClient />}
    </div>
  );
}
