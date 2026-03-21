'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InboxCommentCard } from './InboxCommentCard';
import type { InboxComment } from '@/types/database';

export function CommentsInboxClient() {
  const router = useRouter();
  const [comments, setComments] = useState<InboxComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch('/api/businesses/comments?limit=20');
        const data = await res.json();
        setComments(data.comments ?? []);
        setCursor(data.cursor ?? null);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchInitial();
  }, []);

  // Load more
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/businesses/comments?limit=20&cursor=${cursor}`);
      const data = await res.json();
      setComments((prev) => [...prev, ...(data.comments ?? [])]);
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

  return (
    <div className="flex flex-col md:overflow-y-auto md:flex-1 md:min-h-0">
      <div className="w-full px-4 pb-24" style={{ maxWidth: 960 }}>
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
            Comments
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="rounded-lg" style={{ width: 48, height: 48, backgroundColor: 'var(--bg-elevated)' }} />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="rounded" style={{ width: '40%', height: 14, backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="rounded" style={{ width: '80%', height: 14, backgroundColor: 'var(--bg-elevated)' }} />
                  <div className="rounded" style={{ width: '30%', height: 12, backgroundColor: 'var(--bg-elevated)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16">
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>
              No comments yet
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 280 }}>
              No comments on your dishes yet. Comments will appear here when customers leave them.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {comments.map((comment) => (
                <InboxCommentCard key={comment.id} comment={comment} />
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
    </div>
  );
}
