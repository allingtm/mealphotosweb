'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import type { BusinessPost } from '@/types/database';

interface BusinessPostGridProps {
  username: string;
}

export function BusinessPostGrid({ username }: BusinessPostGridProps) {
  const locale = useLocale();
  const [posts, setPosts] = useState<BusinessPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/business-posts?username=${encodeURIComponent(username)}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPosts(data.posts ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 48 }}>
        <div
          className="animate-spin rounded-full"
          style={{
            width: 24,
            height: 24,
            border: '2px solid var(--bg-elevated)',
            borderTopColor: 'var(--accent-primary)',
          }}
        />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 48 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          No updates yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ padding: '16px 0' }}>
      {posts.map((post) => (
        <article
          key={post.id}
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--bg-elevated)',
          }}
        >
          {post.image_url && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ marginBottom: 12, position: 'relative', aspectRatio: '16 / 9' }}
            >
              <Image
                src={post.image_url}
                alt={post.title || 'Post image'}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}
          {post.title && (
            <h3
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 4px',
              }}
            >
              {post.title}
            </h3>
          )}
          {post.body && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {post.body}
            </p>
          )}
          <time
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'block',
              marginTop: 8,
            }}
          >
            {new Date(post.created_at).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </time>
        </article>
      ))}
    </div>
  );
}
