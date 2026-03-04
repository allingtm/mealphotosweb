'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { recipeSchema } from '@/lib/validations/recipe';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import type { Recipe } from '@/types/database';
import posthog from 'posthog-js';

interface RecipeFormProps {
  mealId: string;
  onRecipeAdded: (recipe: Recipe) => void;
}

interface IngredientRow {
  quantity: string;
  unit: string;
  name: string;
}

const UNIT_OPTIONS = [
  'g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'piece', 'pinch',
] as const;

const inputStyle = {
  backgroundColor: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  border: '1px solid rgba(245, 240, 232, 0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  outline: 'none',
  width: '100%',
} as const;

export function RecipeForm({ mealId, onRecipeAdded }: RecipeFormProps) {
  const t = useTranslations('recipe');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { quantity: '', unit: 'g', name: '' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [cookTime, setCookTime] = useState('');
  const [serves, setServes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { quantity: '', unit: 'g', name: '' }]);
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateIngredient = useCallback(
    (index: number, field: keyof IngredientRow, value: string) => {
      setIngredients((prev) =>
        prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
      );
    },
    []
  );

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, '']);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      const payload = {
        meal_id: mealId,
        ingredients: ingredients.map((ing) => ({
          quantity: Number(ing.quantity),
          unit: ing.unit,
          name: ing.name,
        })),
        method: steps,
        cook_time_minutes: cookTime ? Number(cookTime) : null,
        serves: serves ? Number(serves) : null,
      };

      const parsed = recipeSchema.safeParse(payload);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join('.');
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setSubmitting(true);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          meal_id: parsed.data.meal_id,
          ingredients: parsed.data.ingredients as unknown as Record<string, unknown>[],
          method: parsed.data.method,
          cook_time_minutes: parsed.data.cook_time_minutes ?? null,
          serves: parsed.data.serves ?? null,
        })
        .select()
        .single();

      setSubmitting(false);

      if (error) {
        setErrors({ form: t('failedToSave') });
        return;
      }

      posthog.capture(ANALYTICS_EVENTS.RECIPE_ADDED, {
        meal_id: mealId,
        ingredients_count: parsed.data.ingredients.length,
        steps_count: parsed.data.method.length,
      });

      onRecipeAdded(data as unknown as Recipe);
    },
    [mealId, ingredients, steps, cookTime, serves, onRecipeAdded]
  );

  return (
    <div style={{ padding: '24px 0' }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 400,
          color: 'var(--text-primary)',
          marginBottom: 16,
        }}
      >
        {t('addRecipe')}
      </h3>

      <form onSubmit={handleSubmit}>
        {/* Ingredients */}
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 12,
            }}
          >
            {t('ingredients')}
          </legend>

          <div className="flex flex-col gap-3">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={t('ingredientQty')}
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                  style={{ ...inputStyle, width: 72, flexShrink: 0 }}
                  aria-label={t('ingredientQtyLabel', { n: i + 1 })}
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  style={{ ...inputStyle, width: 80, flexShrink: 0 }}
                  aria-label={t('ingredientUnitLabel', { n: i + 1 })}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder={t('ingredientName')}
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label={t('ingredientNameLabel', { n: i + 1 })}
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={t('removeIngredient', { n: i + 1 })}
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors['ingredients'] && (
            <p style={{ color: 'var(--status-error)', fontSize: 13, marginTop: 4 }}>
              {errors['ingredients']}
            </p>
          )}

          <button
            type="button"
            onClick={addIngredient}
            className="flex items-center gap-1"
            style={{
              marginTop: 8,
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(245, 240, 232, 0.2)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={1.5} />
            {t('addIngredient')}
          </button>
        </fieldset>

        {/* Method */}
        <fieldset style={{ border: 'none', padding: 0, margin: 0, marginTop: 24 }}>
          <legend
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 12,
            }}
          >
            {t('method')}
          </legend>

          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    width: 24,
                    paddingTop: 10,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}.
                </span>
                <textarea
                  placeholder={t('stepPlaceholder', { n: i + 1 })}
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                  aria-label={t('stepLabel', { n: i + 1 })}
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 36,
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={t('removeStep', { n: i + 1 })}
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {errors['method'] && (
            <p style={{ color: 'var(--status-error)', fontSize: 13, marginTop: 4 }}>
              {errors['method']}
            </p>
          )}

          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1"
            style={{
              marginTop: 8,
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(245, 240, 232, 0.2)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={1.5} />
            {t('addStep')}
          </button>
        </fieldset>

        {/* Cook time & Serves */}
        <div className="flex gap-4" style={{ marginTop: 24 }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {t('cookTimeMins')}
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {t('serves')}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={serves}
              onChange={(e) => setServes(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Form-level error */}
        {errors['form'] && (
          <p
            style={{
              color: 'var(--status-error)',
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {errors['form']}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            marginTop: 24,
            padding: '12px 24px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 600,
            border: 'none',
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'opacity 200ms',
          }}
        >
          {submitting ? 'Saving...' : t('saveRecipe')}
        </button>
      </form>
    </div>
  );
}
