import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { calculateReadingTime } from '@/lib/utils/reading-time';
import type { BlogTag } from '@/types/database';
import { BlogContent } from '@/components/blog/BlogContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, meta_title, meta_description, og_image_url, published_at, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (!post) return {};

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      images: post.og_image_url ? [{ url: post.og_image_url }] : undefined,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.og_image_url ? [post.og_image_url] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (!post) notFound();

  // Fetch tags
  const { data: postTags } = await supabase
    .from('blog_post_tags')
    .select('blog_tags(id, name, slug)')
    .eq('blog_post_id', post.id);

  const tags: BlogTag[] = (postTags ?? [])
    .map(pt => pt.blog_tags as unknown as BlogTag)
    .filter(Boolean);

  const readingTime = calculateReadingTime(post.content);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.og_image_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: 'meal.photos',
      url: 'https://meal.photos',
    },
    publisher: {
      '@type': 'Organization',
      name: 'meal.photos',
      logo: { '@type': 'ImageObject', url: 'https://meal.photos/logo.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://meal.photos/blog/${post.slug}`,
    },
    wordCount: post.content.split(/\s+/).length,
    keywords: tags.map(t => t.name).join(', '),
  };

  return (
    <article style={{ minHeight: 'calc(100dvh - 8rem)', padding: '24px 16px 64px', maxWidth: 760, margin: '0 auto' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--accent-primary)',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: 20,
        }}
      >
        &larr; Back to Blog
      </Link>

      {/* Hero image */}
      {post.og_image_url && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <img
            src={post.og_image_url}
            alt={post.title}
            style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 400, objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          color: 'var(--text-primary)',
          margin: '0 0 12px',
          lineHeight: 1.2,
        }}
      >
        {post.title}
      </h1>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 8 }}>
        {post.published_at && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
            {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>
          {readingTime} min read
        </span>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
          {tags.map(tag => (
            <Link
              key={tag.id}
              href={`/blog/tag/${tag.slug}`}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--bg-elevated)', margin: '0 0 32px' }} />

      {/* Markdown content */}
      <BlogContent content={post.content} />

      <hr style={{ border: 'none', borderTop: '1px solid var(--bg-elevated)', margin: '48px 0 24px' }} />

      <Link
        href="/blog"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--accent-primary)',
          textDecoration: 'none',
        }}
      >
        &larr; Back to Blog
      </Link>
    </article>
  );
}
