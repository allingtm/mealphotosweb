'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { BlogCard } from './BlogCard';

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  og_image_url: string | null;
  featured?: boolean;
  published_at: string | null;
  content?: string;
  tags?: { id: string; name: string; slug: string }[];
}

interface BlogFeedProps {
  initialPosts: BlogPostItem[];
  initialCursor: string | null;
  initialHasMore: boolean;
  tag?: string;
}

export function BlogFeed({ initialPosts, initialCursor, initialHasMore, tag }: BlogFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ cursor, limit: '10' });
      if (tag) params.set('tag', tag);
      const res = await fetch(`/api/blog?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(prev => [...prev, ...(json.data ?? [])]);
        setCursor(json.nextCursor);
        setHasMore(json.hasMore);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, tag]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset when tag changes
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
  }, [initialPosts, initialCursor, initialHasMore]);

  if (posts.length === 0 && !loading) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>
        No posts yet.
      </p>
    );
  }

  return (
    <>
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}
      >
        {posts.map(post => (
          <BlogCard
            key={post.id}
            title={post.title}
            slug={post.slug}
            excerpt={post.excerpt}
            og_image_url={post.og_image_url}
            published_at={post.published_at}
            tags={post.tags}
            content={post.content}
          />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          {loading && (
            <div
              style={{
                width: 24,
                height: 24,
                border: '2px solid var(--bg-elevated)',
                borderTopColor: 'var(--accent-primary)',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
