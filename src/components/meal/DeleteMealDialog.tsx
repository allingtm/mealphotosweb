'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import posthog from 'posthog-js';

interface DeleteMealDialogProps {
  mealId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteMealDialog({ mealId, isOpen, onClose }: DeleteMealDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, deleting, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/meals/${mealId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Failed to delete meal', 'error');
        setDeleting(false);
        return;
      }
      posthog.capture(ANALYTICS_EVENTS.MEAL_DELETED, { meal_id: mealId });
      showToast('Meal deleted', 'success');
      onClose();
      router.push('/feed');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
      setDeleting(false);
    }
  }, [mealId, onClose, router]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current && !deleting) onClose();
      }}
    >
      <div
        className="w-full max-w-sm mx-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 24,
          padding: '32px 24px',
        }}
      >
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            backgroundColor: 'rgba(212, 85, 58, 0.15)',
          }}
        >
          <Trash2 size={28} strokeWidth={1.5} style={{ color: 'var(--status-error)' }} />
        </div>

        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          Delete this meal?
        </h2>
        <p
          className="text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}
        >
          This will permanently remove the meal, all ratings, and any recipe. This cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-xl transition-opacity disabled:opacity-50"
            style={{
              height: 48,
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl transition-opacity disabled:opacity-50"
            style={{
              height: 48,
              backgroundColor: 'var(--status-error)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
