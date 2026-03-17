'use client';

import { useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { BusinessType, BusinessTypeGroup } from '@/types/database';

type FilterValue = BusinessType | BusinessTypeGroup | 'all';

interface FilterPill {
  label: string;
  value: FilterValue;
  emoji?: string;
}

const FILTER_PILLS: FilterPill[] = [
  { label: 'All', value: 'all' },
  { label: 'Restaurants', value: 'restaurant', emoji: '🍽' },
  { label: 'Cafés', value: 'cafe', emoji: '☕' },
  { label: 'Takeaways', value: 'takeaway', emoji: '🍕' },
  { label: 'Pubs', value: 'pub', emoji: '🍺' },
  { label: 'Bakeries', value: 'bakery', emoji: '🥐' },
  { label: 'Chefs', value: 'chefs_experiences', emoji: '🧑‍🍳' },
  { label: 'Nutrition', value: 'health_nutrition', emoji: '🥗' },
  { label: 'Shops', value: 'shops_retail', emoji: '🛒' },
];

const DRAG_THRESHOLD = 5;

export function MapFilterPills() {
  const mapTypeFilter = useAppStore((s) => s.mapTypeFilter);
  const setMapTypeFilter = useAppStore((s) => s.setMapTypeFilter);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, didDrag: false });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || e.pointerType === 'touch') return; // touch devices use native scroll
    el.setPointerCapture(e.pointerId);
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      didDrag: false,
    };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state.isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - state.startX;
    if (Math.abs(dx) > DRAG_THRESHOLD) state.didDrag = true;
    el.scrollLeft = state.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (el) {
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    }
    dragState.current.isDragging = false;
  }, []);

  const onPillClick = useCallback((value: FilterValue) => {
    if (dragState.current.didDrag) return; // ignore clicks after drag
    setMapTypeFilter(value);
  }, [setMapTypeFilter]);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto whitespace-nowrap px-4 py-2"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)',
        backdropFilter: 'blur(8px)',
        scrollbarWidth: 'none',
        cursor: 'grab',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="inline-flex gap-2">
        {FILTER_PILLS.map((pill) => {
          const isActive = mapTypeFilter === pill.value;
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => onPillClick(pill.value)}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                fontSize: 13,
              }}
            >
              {pill.emoji && <span className="mr-1">{pill.emoji}</span>}
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
