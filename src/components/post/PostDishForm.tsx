'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, Camera, Plus, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/Toast';
import { useAppStore } from '@/lib/store';
import { PremiseSwitcher } from '@/components/business/PremiseSwitcher';
import type { BusinessPremise } from '@/types/database';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      getResponse: (widgetId: string) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface MenuItem {
  id: string;
  name: string;
  section_id: string;
  menu_sections: { name: string } | { name: string }[] | null;
}

interface PostDishFormProps {
  plan: string;
  menuItems: MenuItem[];
}

export function PostDishForm({ plan, menuItems }: PostDishFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const premises = useAppStore((s) => s.premises);
  const activePremiseId = useAppStore((s) => s.activePremiseId);
  const setPremises = useAppStore((s) => s.setPremises);
  const setActivePremiseId = useAppStore((s) => s.setActivePremiseId);

  // Load premises if not already loaded
  useEffect(() => {
    if (premises.length > 0) return;
    fetch('/api/businesses/premises')
      .then((r) => r.json())
      .then((data) => {
        const list: BusinessPremise[] = data.premises ?? [];
        setPremises(list);
        if (list.length > 0 && !activePremiseId) {
          setActivePremiseId(list[0].id);
        }
      })
      .catch(() => {});
  }, [premises.length, activePremiseId, setPremises, setActivePremiseId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 4 - images.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('Image must be under 10MB', 'error');
        continue;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        showToast('Only JPEG, PNG, and WebP accepted', 'error');
        continue;
      }
      setImages((prev) => [...prev, file]);
      setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Turnstile
  const turnstileRef = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!turnstileContainerRef.current || !window.turnstile) return;
      clearInterval(interval);
      const widgetId = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: () => {},
      });
      turnstileRef.current = widgetId;
    }, 200);
    return () => {
      clearInterval(interval);
      if (turnstileRef.current && window.turnstile) {
        window.turnstile.remove(turnstileRef.current);
      }
    };
  }, []);

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || images.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('metadata', JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        price_pence: price ? Math.round(parseFloat(price) * 100) : undefined,
        menu_item_id: menuItemId || undefined,
        comments_enabled: commentsEnabled,
        premise_id: activePremiseId || undefined,
      }));

      images.forEach((img) => formData.append('images', img));

      const turnstileToken = turnstileRef.current
        ? window.turnstile?.getResponse(turnstileRef.current)
        : (process.env.NODE_ENV === 'development' ? 'dev-bypass' : undefined);
      if (turnstileToken) formData.set('turnstile_token', turnstileToken);

      const res = await fetch('/api/dishes', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to post dish', 'error');
        return;
      }

      posthog.capture('dish_posted', {
        has_price: !!price,
        has_description: !!description.trim(),
        image_count: images.length,
      });

      showToast('Dish posted!', 'success');
      router.push('/me');
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = title.trim().length > 0 && images.length > 0 && !submitting;

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="mx-auto w-full px-4 pb-24 max-w-lg md:max-w-none">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <button type="button" onClick={() => router.back()} style={{ color: 'var(--text-secondary)' }}>
            <X size={24} strokeWidth={1.5} />
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' }}>
            Post a Dish
          </h1>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost}
            className="rounded-full px-4 py-1.5 font-semibold transition-opacity disabled:opacity-40"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
          </button>
        </div>

        {/* Premise selector */}
        {premises.length > 1 && (
          <div className="mb-4">
            <PremiseSwitcher />
          </div>
        )}

        {/* Photo area */}
        {images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed"
            style={{
              aspectRatio: '4/5',
              borderColor: 'var(--bg-elevated)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
            }}
          >
            <Camera size={40} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>
              Take a photo or choose from gallery
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Main preview */}
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '4/5' }}>
              <Image
                src={previews[0]}
                alt="Dish preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Thumbnails row */}
            <div className="flex gap-2">
              {previews.map((preview, i) => (
                <div key={i} className="relative" style={{ width: 64, height: 64 }}>
                  <Image src={preview} alt="" fill className="object-cover rounded-lg" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
                    style={{ width: 20, height: 20, backgroundColor: 'var(--status-error)', color: '#FFF' }}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}

              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center rounded-lg border border-dashed"
                  style={{ width: 64, height: 64, borderColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  <Plus size={20} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Form fields */}
        <div className="flex flex-col gap-4 mt-6">
          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Dish name <span style={{ color: 'var(--status-error)' }}>*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Lamb Shank"
              className="mt-1"
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Price (optional)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>£</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="16.95"
                step="0.01"
                min="0"
                className="pl-7"
              />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              rows={2}
              placeholder="Just plated — slow cooked for 8 hours."
              className="mt-1"
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', float: 'right' }}>
              {description.length}/160
            </span>
          </div>

          {menuItems.length > 0 && (
            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Link to menu item (optional)
              </label>
              <select
                value={menuItemId}
                onChange={(e) => setMenuItemId(e.target.value)}
                className="w-full mt-1 rounded-lg border px-3 py-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                }}
              >
                <option value="">Select from your menu</option>
                {menuItems.map((item) => {
                  const sectionName = Array.isArray(item.menu_sections)
                    ? item.menu_sections[0]?.name
                    : item.menu_sections?.name;
                  return (
                    <option key={item.id} value={item.id}>
                      {sectionName ? `${sectionName} — ` : ''}{item.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>
              Allow comments
            </label>
            <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
          </div>
        </div>
      </div>
      <div ref={turnstileContainerRef} />
    </div>
  );
}
