'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Suggestion {
  id: string;
  name: string;
  category: string | null;
}

interface IngredientInputProps {
  value: string[];
  onChange: (ingredients: string[]) => void;
  maxItems?: number;
}

export function IngredientInput({ value, onChange, maxItems = 30 }: IngredientInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/ingredients?q=${encodeURIComponent(q.trim())}&limit=8`);
      const data = await res.json();
      // Filter out already-selected ingredients
      const filtered = (data.ingredients ?? []).filter(
        (s: Suggestion) => !value.some((v) => v.toLowerCase() === s.name.toLowerCase())
      );
      setSuggestions(filtered);
    } catch {
      setSuggestions([]);
    }
  }, [value]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setHighlightIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim()) {
      setShowDropdown(true);
      debounceRef.current = setTimeout(() => fetchSuggestions(q), 250);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const addIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.length >= maxItems) return;
    // Prevent duplicates (case-insensitive)
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  };

  const removeIngredient = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        addIngredient(suggestions[highlightIndex].name);
      } else if (query.trim()) {
        addIngredient(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIdx = showNewOption ? suggestions.length : suggestions.length - 1;
      setHighlightIndex((prev) => Math.min(prev + 1, maxIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeIngredient(value.length - 1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const trimmedQuery = query.trim();
  const showNewOption = trimmedQuery.length > 0 &&
    !suggestions.some((s) => s.name.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === trimmedQuery.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      {/* Selected ingredient pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((ing, i) => (
            <span
              key={ing}
              className="flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {ing}
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 16,
                  height: 16,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--text-secondary)',
                }}
                aria-label={`Remove ${ing}`}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      {value.length < maxItems && (
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.trim()) setShowDropdown(true); }}
          placeholder={value.length > 0 ? 'Add more...' : 'e.g. Chicken, Avocado, Chilli'}
          maxLength={60}
          autoComplete="off"
        />
      )}

      {/* Dropdown */}
      {showDropdown && (suggestions.length > 0 || showNewOption) && (
        <div
          className="absolute left-0 right-0 mt-1 z-50 rounded-xl shadow-lg overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--bg-elevated)',
            maxHeight: 220,
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addIngredient(s.name)}
              className="w-full text-left px-3 py-2.5 flex items-center justify-between"
              style={{
                backgroundColor: highlightIndex === i ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>{s.name}</span>
              {s.category && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {s.category}
                </span>
              )}
            </button>
          ))}
          {showNewOption && (
            <button
              type="button"
              onClick={() => addIngredient(trimmedQuery)}
              className="w-full text-left px-3 py-2.5 flex items-center gap-1.5"
              style={{
                backgroundColor: highlightIndex === suggestions.length ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                borderTop: suggestions.length > 0 ? '1px solid var(--bg-elevated)' : 'none',
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Add &ldquo;{trimmedQuery}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
