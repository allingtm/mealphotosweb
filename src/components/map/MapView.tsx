'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
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

function getDistanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkProximityNotifications(userLat: number, userLng: number) {
  try {
    const supabase = createBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: saves } = await supabase
      .from('saves')
      .select(`
        dish_id,
        dishes!inner(title, business_id,
          business_profiles:business_id(id, business_name, location))
      `)
      .eq('user_id', user.id);

    if (!saves?.length) return;

    for (const save of saves) {
      const dish = save.dishes as unknown as { title: string; business_id: string; business_profiles: { id: string; business_name: string; location: { coordinates: number[] } | null } };
      const biz = dish?.business_profiles;
      if (!biz?.location?.coordinates) continue;

      const distance = getDistanceMetres(userLat, userLng, biz.location.coordinates[1], biz.location.coordinates[0]);
      if (distance > 200) continue;

      const key = `proximity_${biz.id}`;
      const lastNotified = localStorage.getItem(key);
      if (lastNotified && Date.now() - parseInt(lastNotified) < 86_400_000) continue;

      fetch('/api/notifications/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: biz.id,
          dish_title: dish.title,
          business_name: biz.business_name,
        }),
      }).catch(() => {});

      localStorage.setItem(key, Date.now().toString());

      posthog.capture('proximity_notification_sent', {
        business_id: biz.id,
        dish_id: save.dish_id,
        distance_m: Math.round(distance),
      });
    }
  } catch { /* proximity check is non-critical */ }
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
      limit: '500',
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
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
      }

      // Cluster circles — sized and shaded by point count
      if (!map.getLayer('clusters')) {
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'businesses',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step', ['get', 'point_count'],
              '#E8A838',    // small clusters (< 25)
              25, '#D4943A', // medium (25–99)
              100, '#C47F2C', // large (100+)
            ],
            'circle-radius': [
              'step', ['get', 'point_count'],
              16,           // small
              25, 22,       // medium
              100, 30,      // large
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': PIN_STROKE[t],
            'circle-opacity': 0.9,
          },
        });
      }

      // Cluster count labels
      if (!map.getLayer('cluster-count')) {
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'businesses',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#121212',
          },
        });
      }

      // Individual (unclustered) pins
      if (!map.getLayer('unclustered-point')) {
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'businesses',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 5,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': PIN_STROKE[t],
            'circle-opacity': 0.9,
          },
        });
      }

      // Pulse layer for recently active businesses (unclustered only)
      if (!map.getLayer('unclustered-point-pulse')) {
        map.addLayer({
          id: 'unclustered-point-pulse',
          type: 'circle',
          source: 'businesses',
          filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'is_recent'], true]],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 10,
            'circle-opacity': 0.2,
          },
        });
      }

      fetchPins(map, filterRef.current);
    });

    // Cluster click — zoom to expand
    map.on('click', 'clusters', (e) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const clusterId = feature.properties.cluster_id as number;
      const source = map.getSource('businesses') as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates;
        map.flyTo({
          center: [coords[0], coords[1]] as [number, number],
          zoom: zoom ?? 14,
          duration: 500,
        });
      });

      posthog.capture('map_cluster_tapped', {
        point_count: feature.properties.point_count,
        zoom_level: map.getZoom(),
      });
    });

    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });

    // Pin click
    map.on('click', 'unclustered-point', (e) => {
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

    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapPosition([center.lng, center.lat], map.getZoom());
      debouncedFetch(map, filterRef.current);
    });

    mapRef.current = map;

    // Auto-center on user location + check proximity notifications
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, duration: 2000 });
        checkProximityNotifications(pos.coords.latitude, pos.coords.longitude);
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
    <div className="relative flex-1 flex flex-col min-h-0 min-w-0">
      <MapFilterPills />
      <div ref={mapContainer} className="flex-1 min-h-0 md:rounded-2xl md:overflow-hidden" />
      {selectedPin && (
        <PinBottomSheet pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}
