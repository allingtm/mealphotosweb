'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { IngredientInput } from '@/components/post/IngredientInput';

interface DishEditDialogProps {
  dish: {
    id: string;
    title: string;
    description: string | null;
    price_pence: number | null;
    comments_enabled: boolean;
    ingredients: string[];
  };
  onClose: () => void;
  onSaved: (updated: { title?: string; description?: string | null; price_pence?: number | null; comments_enabled?: boolean; ingredients?: string[] }) => void;
}

export function DishEditDialog({ dish, onClose, onSaved }: DishEditDialogProps) {
  const [title, setTitle] = useState(dish.title);
  const [description, setDescription] = useState(dish.description ?? '');
  const [pricePounds, setPricePounds] = useState(
    dish.price_pence != null ? (dish.price_pence / 100).toFixed(2) : ''
  );
  const [ingredients, setIngredients] = useState<string[]>(dish.ingredients ?? []);
  const [commentsEnabled, setCommentsEnabled] = useState(dish.comments_enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      price_pence: pricePounds ? Math.round(parseFloat(pricePounds) * 100) : null,
      ingredients,
      comments_enabled: commentsEnabled,
    };

    try {
      const res = await fetch(`/api/dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Failed to save');
        return;
      }

      onSaved(payload as { title: string; description: string | null; price_pence: number | null; comments_enabled: boolean });
      onClose();
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 24,
          padding: '32px 24px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            Edit Dish
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: 'var(--status-error)', fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          {/* Title */}
          <label className="flex flex-col gap-1">
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Title <span style={{ color: 'var(--status-error)' }}>*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1">
            <span className="flex items-center justify-between">
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Description
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
                {description.length}/160
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                outline: 'none',
                resize: 'vertical' as const,
              }}
            />
          </label>

          {/* Price */}
          <label className="flex flex-col gap-1">
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Price (£)
            </span>
            <input
              type="number"
              value={pricePounds}
              onChange={(e) => setPricePounds(e.target.value)}
              min="0"
              step="0.01"
              placeholder="Leave blank for no price"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--bg-elevated)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </label>

          {/* Ingredients */}
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ingredients
            </span>
            <IngredientInput value={ingredients} onChange={setIngredients} />
          </div>

          {/* Comments toggle */}
          <label className="flex items-center gap-3" style={{ padding: '4px 0' }}>
            <input
              type="checkbox"
              checked={commentsEnabled}
              onChange={(e) => setCommentsEnabled(e.target.checked)}
              className="rounded"
              style={{ width: 20, height: 20, accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)' }}>
              Comments enabled
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl"
            style={{
              border: '1px solid var(--bg-elevated)',
              background: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
