'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toast';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import type { CommentWithProfile } from '@/types/database';

interface CommentsSectionProps {
  dishId: string;
  businessId: string;
  commentsEnabled: boolean;
  commentCount: number;
}

export function CommentsSection({
  dishId,
  businessId,
  commentsEnabled,
  commentCount: initialCount,
}: CommentsSectionProps) {
  const user = useAppStore((s) => s.user);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(initialCount);

  // Fetch comments on mount
  useEffect(() => {
    if (!commentsEnabled) return;
    let cancelled = false;

    async function fetchComments() {
      setLoading(true);
      try {
        const res = await fetch(`/api/comments/${dishId}?limit=50`);
        if (cancelled) return;
        const data = await res.json();
        setComments(data.comments ?? []);
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchComments();
    return () => { cancelled = true; };
  }, [dishId, commentsEnabled]);

  const handleCommentPosted = useCallback((comment: CommentWithProfile) => {
    setComments((prev) => [...prev, comment]);
    setCount((c) => c + 1);
  }, []);

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        handleCommentDeleted(commentId);
      } else {
        showToast('Failed to delete comment', 'error');
      }
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  }, [handleCommentDeleted]);

  if (!commentsEnabled) {
    return (
      <div>
        <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Comments
        </h3>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
          Comments are turned off for this dish.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
        Comments{count > 0 ? ` (${count})` : ''}
      </h3>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
          No comments yet. Be the first to ask a question!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwnComment={user?.id === comment.user_id}
              isBusinessOwner={comment.is_business_owner}
              canDelete={user?.id === comment.user_id || user?.id === businessId}
              onDelete={() => handleDeleteComment(comment.id)}
            />
          ))}
        </div>
      )}

      <CommentInput
        dishId={dishId}
        businessId={businessId}
        onCommentPosted={handleCommentPosted}
      />
    </div>
  );
}
