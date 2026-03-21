'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Loader2, PlusCircle } from 'lucide-react';
import cloudflareLoader from '@/lib/cloudflare-loader';
import { DishEditDialog } from '@/components/dish/DishEditDialog';
import { timeAgo } from '@/lib/utils/timeAgo';
import { formatPrice } from '@/lib/utils';

interface MyDish {
  id: string;
  title: string;
  description: string | null;
  price_pence: number | null;
  photo_url: string;
  photo_blur_hash: string | null;
  image_count: number;
  reaction_count: number;
  save_count: number;
  comment_count: number;
  comments_enabled: boolean;
  created_at: string;
  premise_id: string | null;
}

export function MyDishesClient() {
  const router = useRouter();
  const [dishes, setDishes] = useState<MyDish[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editDish, setEditDish] = useState<MyDish | null>(null);
  const [deleteDish, setDeleteDish] = useState<MyDish | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    async function fetchDishes() {
      try {
        const res = await fetch('/api/businesses/dishes?limit=20');
        const data = await res.json();
        setDishes(data.dishes ?? []);
        setCursor(data.cursor ?? null);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchDishes();
  }, []);

  // Load more
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/businesses/dishes?limit=20&cursor=${cursor}`);
      const data = await res.json();
      setDishes((prev) => [...prev, ...(data.dishes ?? [])]);
      setCursor(data.cursor ?? null);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  // IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200% 0px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  function handleEditSaved(updated: { title?: string; description?: string | null; price_pence?: number | null; comments_enabled?: boolean }) {
    if (!editDish) return;
    setDishes((prev) => prev.map((d) => d.id === editDish.id ? { ...d, ...updated } : d));
  }

  async function handleDelete() {
    if (!deleteDish) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dishes/${deleteDish.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDishes((prev) => prev.filter((d) => d.id !== deleteDish.id));
        setDeleteDish(null);
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full max-w-lg mx-auto px-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            aria-label="Go back"
          >
            <ArrowLeft size={20} strokeWidth={1.5} style={{ color: 'var(--text-primary)' }} />
          </button>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            My Dishes
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
              No dishes yet
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 280 }}>
              You haven&apos;t posted any dishes yet. Share what you&apos;re serving!
            </p>
            <Link
              href="/post"
              className="flex items-center gap-2 rounded-2xl px-6 py-3"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--primary-foreground)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <PlusCircle size={18} strokeWidth={1.5} />
              Post your first dish
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--bg-elevated)',
                  }}
                >
                  {/* Thumbnail */}
                  <Link href={`/dish/${dish.id}`} className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 60, height: 60 }}>
                    <Image
                      src={dish.photo_url}
                      alt={dish.title}
                      width={60}
                      height={60}
                      className="object-cover"
                      loader={cloudflareLoader}
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/dish/${dish.id}`}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dish.title}
                    </Link>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0' }}>
                      {dish.price_pence != null && `${formatPrice(dish.price_pence)} · `}
                      {dish.reaction_count} reaction{dish.reaction_count !== 1 ? 's' : ''}
                      {' · '}{dish.save_count} save{dish.save_count !== 1 ? 's' : ''}
                      {' · '}{dish.comment_count} comment{dish.comment_count !== 1 ? 's' : ''}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                      Posted {timeAgo(dish.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditDish(dish)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                      aria-label={`Edit ${dish.title}`}
                    >
                      <Pencil size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDish(dish)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                      aria-label={`Delete ${dish.title}`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} style={{ color: 'var(--status-error)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit dialog */}
      {editDish && (
        <DishEditDialog
          dish={editDish}
          onClose={() => setEditDish(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteDish && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="w-full max-w-sm"
            style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 24, padding: '32px 24px' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 8 }}>
              Delete dish?
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
              This will permanently remove &ldquo;{deleteDish.title}&rdquo; and all its reactions, saves, and comments.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteDish(null)}
                className="flex-1 py-3 rounded-2xl"
                style={{
                  border: '1px solid var(--bg-elevated)', background: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl"
                style={{
                  backgroundColor: 'var(--status-error)', color: '#FFFFFF', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
                  cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
