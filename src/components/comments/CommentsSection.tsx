'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import type { CommentWithProfile } from '@/types/database';
import posthog from 'posthog-js';

interface CommentsSectionProps {
  mealId: string;
  mealAuthorId: string;
  commentsEnabled: boolean;
  commentCount: number;
  scrollToComments?: boolean;
  isOwnMeal: boolean;
  isAdmin: boolean;
}

export function CommentsSection({
  mealId,
  mealAuthorId,
  commentsEnabled,
  commentCount: initialCount,
  scrollToComments,
  isOwnMeal,
  isAdmin,
}: CommentsSectionProps) {
  const user = useAppStore((s) => s.user);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCount);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didScroll = useRef(false);

  // Initial fetch
  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId]);

  // Scroll to comments if requested (after first load)
  useEffect(() => {
    if (scrollToComments && !loading && !didScroll.current) {
      didScroll.current = true;
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [scrollToComments, loading]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meals/${mealId}/comments?limit=5`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setComments(data.comments ?? []);
      setHasMore(data.hasMore ?? false);

      posthog.capture(ANALYTICS_EVENTS.COMMENTS_LOADED, {
        meal_id: mealId,
        comment_count: data.comments?.length ?? 0,
        page: 1,
      });
    } catch {
      // Silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, [mealId]);

  const loadMore = async () => {
    if (loadingMore || comments.length === 0) return;
    setLoadingMore(true);

    const oldestComment = comments[0];
    try {
      const res = await fetch(
        `/api/meals/${mealId}/comments?limit=10&cursor=${encodeURIComponent(oldestComment.created_at)}`
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      if (data.comments?.length > 0) {
        // Prepend older comments
        setComments((prev) => [...data.comments, ...prev]);
      }
      setHasMore(data.hasMore ?? false);
    } catch {
      showToast('Failed to load more comments', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCommentPosted = (comment: CommentWithProfile & { _replaces?: string; _remove?: boolean }) => {
    if (comment._remove) {
      // Remove optimistic comment on error
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setCommentCount((c) => Math.max(c - 1, 0));
      return;
    }

    if (comment._replaces) {
      // Replace optimistic with server comment
      setComments((prev) =>
        prev.map((c) => (c.id === comment._replaces ? { ...comment, is_optimistic: false } : c))
      );
      return;
    }

    // New optimistic comment
    setComments((prev) => [...prev, comment]);
    setCommentCount((c) => c + 1);

    posthog.capture(ANALYTICS_EVENTS.COMMENT_POSTED, {
      meal_id: mealId,
      comment_length: comment.text.length,
      is_author_reply: comment.is_author,
    });
  };

  const handleDelete = async (commentId: string) => {
    // Optimistic removal
    const removed = comments.find((c) => c.id === commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((c) => Math.max(c - 1, 0));

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      posthog.capture(ANALYTICS_EVENTS.COMMENT_DELETED, {
        meal_id: mealId,
        deleted_by: removed?.user_id === user?.id ? 'self' : 'admin',
      });
    } catch {
      // Revert
      if (removed) {
        setComments((prev) => [...prev, removed].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
        setCommentCount((c) => c + 1);
      }
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleReport = async (commentId: string, reason: string, detail?: string) => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_comment_id: commentId,
          reason,
          detail: detail ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to report');
      }

      showToast('Report submitted. Thank you.', 'success');

      posthog.capture(ANALYTICS_EVENTS.COMMENT_REPORTED, {
        comment_id: commentId,
        reason,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to submit report',
        'error'
      );
    }
  };

  return (
    <div ref={sectionRef} style={{ marginTop: 24 }}>
      {/* Section header */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 400,
          color: 'var(--text-primary)',
          marginBottom: 8,
          padding: '0 16px',
        }}
      >
        Comments{commentCount > 0 ? ` (${commentCount})` : ''}
      </h2>

      {/* Comment list */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div
            style={{
              padding: '16px 0',
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}
          >
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
            }}
          >
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 0',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--accent-primary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: loadingMore ? 'wait' : 'pointer',
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                {loadingMore ? 'Loading...' : 'Show more comments'}
              </button>
            )}

            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isOwnComment={comment.user_id === user?.id}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onReport={handleReport}
              />
            ))}
          </>
        )}
      </div>

      {/* Comment input — sticky at bottom */}
      <div
        style={{
          position: 'sticky',
          bottom: 56,
          backgroundColor: 'var(--bg-primary)',
          borderTop: '1px solid var(--bg-elevated)',
          zIndex: 10,
        }}
      >
        <CommentInput
          mealId={mealId}
          commentsEnabled={commentsEnabled}
          onCommentPosted={handleCommentPosted}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
