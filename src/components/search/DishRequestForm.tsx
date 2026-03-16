'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/Toast';
import { useAppStore } from '@/lib/store';

export function DishRequestForm() {
  const [dishName, setDishName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const user = useAppStore((s) => s.user);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const handleSubmit = async () => {
    if (!dishName.trim() || !city.trim() || submitting) return;
    if (!user) { openAuthModal(); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/dish-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_name: dishName.trim(), location_city: city.trim() }),
      });

      if (res.ok) {
        posthog.capture('dish_request_created', { dish_name: dishName.trim(), location_city: city.trim() });
        setSubmitted(true);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to submit request', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
          Request submitted!
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
          We&apos;ll let businesses in your area know.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-elevated)' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
        Request a dish
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            What dish are you looking for?
          </label>
          <Input
            value={dishName}
            onChange={(e) => setDishName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Sushi"
            className="mt-1"
          />
        </div>

        <div>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
            Where?
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            placeholder="e.g. Colchester"
            className="mt-1"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!dishName.trim() || !city.trim() || submitting}
          className="w-full rounded-full py-2.5 font-semibold transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-body)', fontSize: 14 }}
        >
          {submitting ? 'Submitting...' : 'Request this dish'}
        </button>
      </div>
    </div>
  );
}
