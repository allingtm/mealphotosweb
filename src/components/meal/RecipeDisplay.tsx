import { Clock, Users } from 'lucide-react';
import type { Recipe, Ingredient } from '@/types/database';

interface RecipeDisplayProps {
  recipe: Recipe;
}

function formatIngredient(ing: Ingredient): string {
  const qty = Number.isInteger(ing.quantity)
    ? ing.quantity.toString()
    : ing.quantity.toFixed(1);
  return `${qty}${ing.unit} ${ing.name}`;
}

export function RecipeDisplay({ recipe }: RecipeDisplayProps) {
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
        Recipe
      </h3>

      {/* Cook time & serves */}
      {(recipe.cook_time_minutes || recipe.serves) && (
        <div
          className="flex items-center gap-4"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}
        >
          {recipe.cook_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock size={16} strokeWidth={1.5} />
              {recipe.cook_time_minutes} mins
            </span>
          )}
          {recipe.serves && (
            <span className="flex items-center gap-1">
              <Users size={16} strokeWidth={1.5} />
              Serves {recipe.serves}
            </span>
          )}
        </div>
      )}

      {/* Ingredients */}
      <h4
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Ingredients
      </h4>
      <ul
        style={{
          listStyle: 'disc',
          paddingLeft: 20,
          marginBottom: 24,
        }}
      >
        {recipe.ingredients.map((ing, i) => (
          <li
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.8,
            }}
          >
            {formatIngredient(ing)}
          </li>
        ))}
      </ul>

      {/* Method */}
      <h4
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Method
      </h4>
      <ol
        style={{
          listStyle: 'decimal',
          paddingLeft: 20,
        }}
      >
        {recipe.method.map((step, i) => (
          <li
            key={i}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.8,
              marginBottom: 8,
            }}
          >
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
