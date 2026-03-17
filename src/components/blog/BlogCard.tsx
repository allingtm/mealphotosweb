import Link from 'next/link';
import { calculateReadingTime } from '@/lib/utils/reading-time';

interface BlogCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  og_image_url: string | null;
  published_at: string | null;
  tags?: { id: string; name: string; slug: string }[];
  content?: string;
  featured?: boolean;
}

export function BlogCard({ title, slug, excerpt, og_image_url, published_at, tags, content, featured }: BlogCardProps) {
  const readingTime = content ? calculateReadingTime(content) : null;

  return (
    <Link
      href={`/blog/${slug}`}
      style={{
        display: 'block',
        borderRadius: 16,
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      {og_image_url && (
        <div style={{ position: 'relative', width: '100%', paddingBottom: featured ? '50%' : '56.25%', overflow: 'hidden' }}>
          <img
            src={og_image_url}
            alt={title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {featured && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--bg-primary)',
                textTransform: 'uppercase',
              }}
            >
              Featured
            </span>
          )}
        </div>
      )}
      <div style={{ padding: 16 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: featured ? 22 : 18,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
        {excerpt && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '8px 0 0',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 12 }}>
          {(tags ?? []).map(tag => (
            <span
              key={tag.id}
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              {tag.name}
            </span>
          ))}
          {published_at && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {new Date(published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
          {readingTime && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {readingTime} min read
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
