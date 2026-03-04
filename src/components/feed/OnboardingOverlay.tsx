'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'meal_photos_onboarding_dismissed';

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  }, []);

  useEffect(() => {
    if (!visible) return;

    function handleInteraction() {
      dismiss();
    }

    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-end"
      style={{ paddingBottom: 120 }}
    >
      {/* Tap to rate hint */}
      <div
        className="flex flex-col items-center gap-2 mb-8"
        style={{ animation: 'fade-in-up 0.5s ease-out' }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            backgroundColor: 'rgba(18, 18, 18, 0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-emphasis)',
            }}
          >
            Tap a number to rate this meal
          </span>
        </div>
        {/* Animated hand tap */}
        <div style={{ animation: 'tap-hint 1.5s ease-in-out infinite' }}>
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-emphasis)"
            strokeWidth="1.5"
          >
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 15" />
          </svg>
        </div>
      </div>

      {/* Swipe up hint */}
      <div
        className="flex flex-col items-center gap-1"
        style={{ animation: 'bounce-up 2s ease-in-out infinite' }}
      >
        <ChevronUp
          size={24}
          strokeWidth={1.5}
          color="var(--text-secondary)"
        />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          Swipe up to skip
        </span>
      </div>
    </div>
  );
}
