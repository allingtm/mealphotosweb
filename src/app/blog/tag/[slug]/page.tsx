import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BlogFeed } from '@/components/blog/BlogFeed';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tag } = await supabase
    .from('blog_tags')
    .select('name')
    .eq('slug', slug)
    .single();

  if (!tag) return {};

  return {
    title: `${tag.name} — Blog`,
    description: `Articles tagged "${tag.name}" on the meal.photos blog.`,
    alternates: { canonical: `/blog/tag/${slug}` },
  };
}

export default async function BlogTagPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch the tag
  const { data: tag } = await supabase
    .from('blog_tags')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!tag) notFound();

  // Fetch all tags for pills
  const { data: allTags } = await supabase
    .from('blog_tags')
    .select('*')
    .order('name');

  // Fetch post IDs for this tag
  const { data: postTagLinks } = await supabase
    .from('blog_post_tags')
    .select('blog_post_id')
    .eq('blog_tag_id', tag.id);

  const postIds = (postTagLinks ?? []).map(pt => pt.blog_post_id);

  const limit = 10;
  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    og_image_url: string | null;
    published_at: string | null;
    content: string;
  }> = [];
  let hasMore = false;

  if (postIds.length > 0) {
    const { data: rawPosts } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, og_image_url, published_at, content')
      .in('id', postIds)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit + 1);

    const allPosts = rawPosts ?? [];
    hasMore = allPosts.length > limit;
    posts = hasMore ? allPosts.slice(0, limit) : allPosts;
  }

  // Fetch tags for each post
  const resultIds = posts.map(p => p.id);
  let tagsByPost: Record<string, { id: string; name: string; slug: string }[]> = {};
  if (resultIds.length > 0) {
    const { data: pt } = await supabase
      .from('blog_post_tags')
      .select('blog_post_id, blog_tags(id, name, slug)')
      .in('blog_post_id', resultIds);

    if (pt) {
      for (const item of pt) {
        if (!tagsByPost[item.blog_post_id]) tagsByPost[item.blog_post_id] = [];
        const t = item.blog_tags as unknown as { id: string; name: string; slug: string };
        if (t) tagsByPost[item.blog_post_id].push(t);
      }
    }
  }

  const enrichedPosts = posts.map(p => ({ ...p, tags: tagsByPost[p.id] ?? [] }));
  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].published_at : null;

  return (
    <div style={{ minHeight: 'calc(100dvh - 8rem)', padding: '24px 16px 64px', maxWidth: 900, margin: '0 auto' }}>
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

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          color: 'var(--text-primary)',
          margin: '0 0 4px',
        }}
      >
        {tag.name}
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
        {postIds.length} article{postIds.length !== 1 ? 's' : ''}
      </p>

      {/* Tag pills */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
        <Link
          href="/blog"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
        >
          All
        </Link>
        {(allTags ?? []).map(t => (
          <Link
            key={t.id}
            href={`/blog/tag/${t.slug}`}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: slug === t.slug ? 600 : 400,
              backgroundColor: slug === t.slug ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: slug === t.slug ? 'var(--bg-primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <BlogFeed
        initialPosts={enrichedPosts}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
        tag={slug}
      />
    </div>
  );
}
