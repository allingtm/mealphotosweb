'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getBusinessTypeGroup, TYPE_GROUP_COLORS } from '@/types/database';
import type { MapBusinessPin } from '@/types/database';
import { MapFilterPills } from './MapFilterPills';
import { PinBottomSheet } from './PinBottomSheet';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

const DEFAULT_CENTER: [number, number] = [-3.5, 54.5];
const DEFAULT_ZOOM = 5.5;

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
} as const;

const THEME_OVERRIDES: Record<'dark' | 'light', [string, string, string][]> = {
  dark: [
    ['water', 'fill-color', '#0A1628'],
    ['landcover', 'fill-color', '#1A1A1A'],
    ['landuse', 'fill-color', '#1E1E1E'],
  ],
  light: [
    ['water', 'fill-color', '#C4DFF6'],
    ['landcover', 'fill-color', '#E8E8E8'],
    ['landuse', 'fill-color', '#F0F0F0'],
  ],
};

const PIN_STROKE: Record<'dark' | 'light', string> = {
  dark: 'rgba(0,0,0,0.3)',
  light: 'rgba(0,0,0,0.15)',
};

function getResolvedTheme(theme: string): 'dark' | 'light' {
  if (theme === 'dark' || theme === 'light') return theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function pinsToGeoJSON(pins: MapBusinessPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => {
      const group = getBusinessTypeGroup(pin.business_type as Parameters<typeof getBusinessTypeGroup>[0]);
      const isRecent = pin.last_post_at
        ? Date.now() - new Date(pin.last_post_at).getTime() < 2 * 60 * 60 * 1000
        : false;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          business_name: pin.business_name,
          business_type: pin.business_type,
          type_group: group,
          color: TYPE_GROUP_COLORS[group] ?? TYPE_GROUP_COLORS.other,
          avatar_url: pin.avatar_url,
          address_city: pin.address_city,
          plan: pin.plan,
          username: pin.username,
          last_post_at: pin.last_post_at,
          is_recent: isRecent,
        },
      };
    }),
  };
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterRef = useRef<string | null>(null);
  const resolvedThemeRef = useRef<'dark' | 'light'>('dark');
  const [selectedPin, setSelectedPin] = useState<MapBusinessPin | null>(null);
  const mapTypeFilter = useAppStore((s) => s.mapTypeFilter);
  const mapCenter = useAppStore((s) => s.mapCenter);
  const mapZoom = useAppStore((s) => s.mapZoom);
  const setMapPosition = useAppStore((s) => s.setMapPosition);
  const { theme } = useTheme();

  const fetchPins = useCallback(async (map: mapboxgl.Map, typeFilter?: string | null) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const params = new URLSearchParams({
      north: bounds.getNorth().toString(),
      south: bounds.getSouth().toString(),
      east: bounds.getEast().toString(),
      west: bounds.getWest().toString(),
      limit: '200',
    });

    if (typeFilter) params.set('type_filter', typeFilter);

    try {
      const res = await fetch(`/api/map/pins?${params}`);
      const data = await res.json();
      const source = map.getSource('businesses') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(pinsToGeoJSON(data.pins ?? []));
      }
    } catch { /* silently fail */ }
  }, []);

  const debouncedFetch = useCallback((map: mapboxgl.Map, typeFilter?: string | null) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPins(map, typeFilter), 300);
  }, [fetchPins]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const resolved = getResolvedTheme(theme);
    resolvedThemeRef.current = resolved;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[resolved],
      center: mapCenter ?? DEFAULT_CENTER,
      zoom: mapZoom ?? DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('style.load', () => {
      const t = resolvedThemeRef.current;

      // Apply theme-specific color overrides
      THEME_OVERRIDES[t].forEach(([layer, prop, val]) => {
        if (map.getLayer(layer)) {
          map.setPaintProperty(layer, prop as string & keyof mapboxgl.AnyPaint, val);
        }
      });

      // Add source (cleared on style swap)
      if (!map.getSource('businesses')) {
        map.addSource('businesses', {
          type: 'geojson',
          data: pinsToGeoJSON([]),
        });
      }

      // Main pin layer
      if (!map.getLayer('business-pins')) {
        map.addLayer({
          id: 'business-pins',
          type: 'circle',
          source: 'businesses',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 5,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': PIN_STROKE[t],
            'circle-opacity': 0.9,
          },
        });
      }

      // Pulse layer for recently active businesses
      if (!map.getLayer('business-pins-pulse')) {
        map.addLayer({
          id: 'business-pins-pulse',
          type: 'circle',
          source: 'businesses',
          filter: ['==', ['get', 'is_recent'], true],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 10,
            'circle-opacity': 0.2,
          },
        });
      }

      fetchPins(map, filterRef.current);
    });

    // Pin click
    map.on('click', 'business-pins', (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const p = feature.properties;
      const coords = (feature.geometry as GeoJSON.Point).coordinates;

      setSelectedPin({
        id: p.id,
        business_name: p.business_name,
        business_type: p.business_type,
        avatar_url: p.avatar_url === 'null' ? null : p.avatar_url,
        address_city: p.address_city === 'null' ? null : p.address_city,
        plan: p.plan,
        lng: coords[0],
        lat: coords[1],
        username: p.username,
        last_post_at: p.last_post_at === 'null' ? null : p.last_post_at,
      });

      posthog.capture('map_pin_tapped', {
        business_id: p.id,
        business_type: p.business_type,
      });
    });

    map.on('mouseenter', 'business-pins', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'business-pins', () => { map.getCanvas().style.cursor = ''; });

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapPosition([center.lng, center.lat], map.getZoom());
      debouncedFetch(map, filterRef.current);
    });

    mapRef.current = map;

    // Auto-center on user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, duration: 2000 });
      },
      () => { /* declined — stay at UK default */ }
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap map style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const resolved = getResolvedTheme(theme);
    if (resolved === resolvedThemeRef.current) return;
    resolvedThemeRef.current = resolved;
    map.setStyle(MAP_STYLES[resolved]);
  }, [theme]);

  // Re-fetch on filter change
  useEffect(() => {
    const filter = mapTypeFilter === 'all' ? null : mapTypeFilter;
    filterRef.current = filter;
    if (!mapRef.current) return;
    fetchPins(mapRef.current, filter);
  }, [mapTypeFilter, fetchPins]);

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10">
        <MapFilterPills />
      </div>
      <div ref={mapContainer} className="flex-1" />
      {selectedPin && (
        <PinBottomSheet pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}
