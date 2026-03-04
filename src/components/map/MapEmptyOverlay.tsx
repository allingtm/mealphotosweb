'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Camera } from 'lucide-react';

interface MapEmptyOverlayProps {
  center: [number, number] | null;
}

async function reverseGeocodeCity(lng: number, lat: number): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,region&limit=1&access_token=${token}`
    );
    const data = await res.json();
    const feature = data.features?.[0];
    return feature?.text || null;
  } catch {
    return null;
  }
}

export function MapEmptyOverlay({ center }: MapEmptyOverlayProps) {
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (!center) return;
    reverseGeocodeCity(center[0], center[1]).then(setCityName);
  }, [center]);

  const locationText = cityName || 'this area';

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex flex-col items-center gap-4 px-8 py-6 rounded-3xl max-w-xs text-center"
        style={{
          backgroundColor: 'rgba(30, 30, 30, 0.92)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        <MapPin
          size={40}
          strokeWidth={1.5}
          style={{ color: 'var(--accent-primary)' }}
        />
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          No meals here yet. Be the first to put {locationText} on the map!
        </p>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#121212',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <Camera size={18} strokeWidth={1.5} />
          Upload a Meal
        </Link>
      </div>
    </div>
  );
}
