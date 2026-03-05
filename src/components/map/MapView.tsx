'use client';

import 'mapbox-gl/dist/mapbox-gl.css';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import posthog from 'posthog-js';
import { useAppStore } from '@/lib/store';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { MapPin } from '@/types/database';
import { PinBottomSheet } from './PinBottomSheet';
import { MapSearchBar } from './MapSearchBar';
import { MapFilterDrawer } from './MapFilterDrawer';
import { MapEmptyOverlay } from './MapEmptyOverlay';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 2;

function pinsToGeoJSON(pins: MapPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature' as const,
      id: pin.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [pin.lng, pin.lat],
      },
      properties: {
        id: pin.id,
        title: pin.title,
        photo_url: pin.photo_url,
        avg_rating: pin.avg_rating,
        rating_count: pin.rating_count,
        recipe_request_count: pin.recipe_request_count,
        is_restaurant: pin.is_restaurant,
        username: pin.username,
      },
    })),
  };
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T & { cancel: () => void };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mapCenter, setMapCenterLocal] = useState<[number, number] | null>(null);
  const explorePinsRef = useRef<MapPin[]>([]);
  const sourceAddedRef = useRef(false);

  const mapFilters = useAppStore((s) => s.mapFilters);
  const savedCenter = useAppStore((s) => s.mapCenter);
  const savedZoom = useAppStore((s) => s.mapZoom);
  const setMapPosition = useAppStore((s) => s.setMapPosition);

  const fetchPins = useCallback(async (map: mapboxgl.Map) => {
    const bounds = map.getBounds();
    if (!bounds) return;

    const params = new URLSearchParams({
      min_lng: bounds.getWest().toString(),
      min_lat: bounds.getSouth().toString(),
      max_lng: bounds.getEast().toString(),
      max_lat: bounds.getNorth().toString(),
      limit: '200',
      time_range: mapFilters.timeRange,
      min_rating: mapFilters.minRating.toString(),
      recipe_only: mapFilters.recipeOnly.toString(),
    });

    try {
      const res = await fetch(`/api/map/pins?${params}`);
      const data = await res.json();
      if (!data.pins) return;

      const viewportPins: MapPin[] = data.pins;
      const explore = explorePinsRef.current;

      // Merge explore pins, deduplicating by ID
      const viewportIds = new Set(viewportPins.map((p) => p.id));
      const merged = [...viewportPins, ...explore.filter((p) => !viewportIds.has(p.id))];

      const source = map.getSource('meals') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData(pinsToGeoJSON(merged));
      }

      setIsEmpty(viewportPins.length === 0);
    } catch (err) {
      console.error('Failed to fetch map pins:', err);
    }
  }, [mapFilters]);

  const fetchExplorePins = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        min_lng: '-180',
        min_lat: '-90',
        max_lng: '180',
        max_lat: '90',
        limit: '20',
      });
      const res = await fetch(`/api/map/pins?${params}`);
      const data = await res.json();
      if (data.pins) {
        explorePinsRef.current = data.pins;
      }
    } catch {
      // Non-critical
    }
  }, []);

  // Custom dark style modifications
  const applyCustomStyle = useCallback((map: mapboxgl.Map) => {
    try {
      // Water
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#0A1628');
      }

      // Land / background
      if (map.getLayer('land')) {
        map.setPaintProperty('land', 'background-color', '#1A1A1A');
      }
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#121212');
      }

      // Mute roads
      const roadLayers = [
        'road-simple', 'road-street', 'road-secondary-tertiary',
        'road-primary', 'road-motorway-trunk', 'road-label-simple',
      ];
      for (const layer of roadLayers) {
        try {
          if (map.getLayer(layer)) {
            const layerDef = map.getLayer(layer);
            if (layerDef && layerDef.type === 'line') {
              map.setPaintProperty(layer, 'line-color', '#2A2A2A');
            }
          }
        } catch {
          // Layer may not exist in this style version
        }
      }

      // Mute labels
      const labelLayers = [
        'road-label-simple', 'settlement-subdivision-label',
        'settlement-minor-label', 'settlement-major-label',
        'state-label', 'country-label', 'continent-label',
      ];
      for (const layer of labelLayers) {
        try {
          if (map.getLayer(layer)) {
            map.setPaintProperty(layer, 'text-color', '#555555');
          }
        } catch {
          // Layer may not exist
        }
      }
    } catch {
      // Style modifications are best-effort
    }
  }, []);

  // Add GeoJSON source and layers
  const addSourceAndLayers = useCallback((map: mapboxgl.Map) => {
    if (sourceAddedRef.current) return;

    map.addSource('meals', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'meals',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#1E1E1E',
        'circle-radius': [
          'step', ['get', 'point_count'],
          20,
          100, 30,
          750, 40,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#F5F0E8',
      },
    });

    // Cluster count labels
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'meals',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#F5F0E8',
      },
    });

    // Individual pins
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'meals',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['get', 'is_restaurant'], '#E8A838',
          '#F5F0E8',
        ],
        'circle-radius': [
          'case',
          ['get', 'is_restaurant'], 7,
          5,
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': [
          'case',
          ['get', 'is_restaurant'], 'rgba(232, 168, 56, 0.4)',
          'rgba(245, 240, 232, 0.3)',
        ],
        'circle-opacity': 1,
        'circle-radius-transition': { duration: 400 },
        'circle-opacity-transition': { duration: 400 },
      },
    });

    sourceAddedRef.current = true;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const initialCenter = savedCenter || DEFAULT_CENTER;
    const initialZoom = savedZoom || DEFAULT_ZOOM;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    mapRef.current = map;

    const debouncedFetch = debounce((..._args: unknown[]) => {
      fetchPins(map);
    }, 300);

    map.on('style.load', () => {
      applyCustomStyle(map);
      addSourceAndLayers(map);

      // Fetch explore pins once, then initial viewport pins
      fetchExplorePins().then(() => fetchPins(map));
    });

    map.on('moveend', () => {
      debouncedFetch();
      const center = map.getCenter();
      const zoom = map.getZoom();
      setMapPosition([center.lng, center.lat], zoom);
      setMapCenterLocal([center.lng, center.lat]);
    });

    // Cluster click → zoom in
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('meals') as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, ((err: unknown, zoom: unknown) => {
        if (err || zoom == null) return;
        const geometry = features[0].geometry;
        if (geometry.type === 'Point') {
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom as number,
          });
        }
      }) as Parameters<typeof source.getClusterExpansionZoom>[1]);
    });

    // Pin click → show bottom sheet
    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0];
      if (!feature || !feature.properties) return;

      const props = feature.properties;
      const pin: MapPin = {
        id: props.id as string,
        title: props.title as string,
        photo_url: props.photo_url as string,
        avg_rating: Number(props.avg_rating),
        rating_count: Number(props.rating_count),
        recipe_request_count: Number(props.recipe_request_count),
        is_restaurant: props.is_restaurant === true || props.is_restaurant === 'true',
        username: props.username as string,
        lng: 0,
        lat: 0,
      };

      // Get coords from geometry
      const geometry = feature.geometry;
      if (geometry.type === 'Point') {
        pin.lng = geometry.coordinates[0];
        pin.lat = geometry.coordinates[1];
      }

      setSelectedPin(pin);

      posthog.capture(ANALYTICS_EVENTS.MAP_PIN_TAPPED, {
        meal_id: pin.id,
        is_restaurant: pin.is_restaurant,
        zoom_level: map.getZoom(),
      });
    });

    // Cursor on hover
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
    map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

    // Request geolocation (only if no saved position)
    if (!savedCenter) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 12,
              duration: 2000,
            });
          },
          () => {
            // Denied or error — stay at default world view
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      }
    }

    return () => {
      debouncedFetch.cancel();
      sourceAddedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch pins when filters change
  useEffect(() => {
    if (mapRef.current && sourceAddedRef.current) {
      fetchPins(mapRef.current);
    }
  }, [mapFilters, fetchPins]);

  const handleFlyTo = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 2000 });
  }, []);

  const hasActiveFilters =
    mapFilters.timeRange !== 'all_time' ||
    mapFilters.minRating > 0 ||
    mapFilters.recipeOnly;

  return (
    <div className="relative w-full flex-1" style={{ minHeight: 0 }}>
      <div ref={mapContainer} className="w-full h-full" />

      <MapSearchBar
        onFlyTo={handleFlyTo}
        onFilterToggle={() => setIsFilterOpen(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {isEmpty && (
        <MapEmptyOverlay center={mapCenter} />
      )}

      <PinBottomSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
      />

      {isFilterOpen && (
        <MapFilterDrawer onClose={() => setIsFilterOpen(false)} />
      )}
    </div>
  );
}

export default MapView;
