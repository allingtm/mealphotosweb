import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogFeed } from '@/components/blog/BlogFeed';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Stories, tips, and updates from the meal.photos community.',
  alternates: {
    types: { 'application/rss+xml': '/blog/rss.xml' },
  },
};

interface Props {
  searchParams: Promise<{ tag?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
  const { tag } = await searchParams;
  const supabase = await createClient();

  // Fetch featured post
  const { data: featuredPost } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, og_image_url, published_at, content')
    .eq('featured', true)
    .eq('published', true)
    .single();

  // Fetch tags for featured post
  let featuredTags: { id: string; name: string; slug: string }[] = [];
  if (featuredPost) {
    const { data: fTags } = await supabase
      .from('blog_post_tags')
      .select('blog_tags(id, name, slug)')
      .eq('blog_post_id', featuredPost.id);
    featuredTags = (fTags ?? [])
      .map(pt => pt.blog_tags as unknown as { id: string; name: string; slug: string })
      .filter(Boolean);
  }

  // Fetch all tags for filter pills
  const { data: allTags } = await supabase
    .from('blog_tags')
    .select('*')
    .order('name');

  // Fetch initial posts for infinite scroll
  const limit = 10;
  let postsQuery = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, og_image_url, published_at, content')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit + 1);

  // If filtering by tag, get post IDs first
  if (tag) {
    const { data: tagData } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('slug', tag)
      .single();

    if (tagData) {
      const { data: postTagLinks } = await supabase
        .from('blog_post_tags')
        .select('blog_post_id')
        .eq('blog_tag_id', tagData.id);

      const postIds = (postTagLinks ?? []).map(pt => pt.blog_post_id);
      if (postIds.length > 0) {
        postsQuery = postsQuery.in('id', postIds);
      } else {
        postsQuery = postsQuery.in('id', ['00000000-0000-0000-0000-000000000000']); // no results
      }
    }
  }

  // Exclude featured post from the grid
  if (featuredPost && !tag) {
    postsQuery = postsQuery.neq('id', featuredPost.id);
  }

  const { data: rawPosts } = await postsQuery;
  const allPosts = rawPosts ?? [];
  const hasMore = allPosts.length > limit;
  const posts = hasMore ? allPosts.slice(0, limit) : allPosts;

  // Fetch tags for each post
  const postIds = posts.map(p => p.id);
  let tagsByPost: Record<string, { id: string; name: string; slug: string }[]> = {};
  if (postIds.length > 0) {
    const { data: postTags } = await supabase
      .from('blog_post_tags')
      .select('blog_post_id, blog_tags(id, name, slug)')
      .in('blog_post_id', postIds);

    if (postTags) {
      for (const pt of postTags) {
        if (!tagsByPost[pt.blog_post_id]) tagsByPost[pt.blog_post_id] = [];
        const t = pt.blog_tags as unknown as { id: string; name: string; slug: string };
        if (t) tagsByPost[pt.blog_post_id].push(t);
      }
    }
  }

  const enrichedPosts = posts.map(p => ({ ...p, tags: tagsByPost[p.id] ?? [] }));
  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].published_at : null;

  // JSON-LD for CollectionPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'meal.photos Blog',
    description: 'Stories, tips, and updates from the meal.photos community.',
    url: 'https://meal.photos/blog',
  };

  return (
    <div className="md:overflow-y-auto md:flex-1 md:min-h-0 max-w-3xl md:max-w-none px-4 pt-6 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          color: 'var(--text-primary)',
          margin: '0 0 4px',
        }}
      >
        Blog
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
          margin: '0 0 24px',
        }}
      >
        Stories, tips, and updates from meal.photos
      </p>

      {/* Featured post */}
      {featuredPost && !tag && (
        <div style={{ marginBottom: 32 }}>
          <BlogCard
            title={featuredPost.title}
            slug={featuredPost.slug}
            excerpt={featuredPost.excerpt}
            og_image_url={featuredPost.og_image_url}
            published_at={featuredPost.published_at}
            tags={featuredTags}
            content={featuredPost.content}
            featured
          />
        </div>
      )}

      {/* Tag filter pills */}
      {(allTags ?? []).length > 0 && (
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
          <Link
            href="/blog"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              fontWeight: !tag ? 600 : 400,
              backgroundColor: !tag ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: !tag ? 'var(--bg-primary)' : 'var(--text-secondary)',
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
                fontWeight: tag === t.slug ? 600 : 400,
                backgroundColor: tag === t.slug ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: tag === t.slug ? 'var(--bg-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Posts grid with infinite scroll */}
      <BlogFeed
        initialPosts={enrichedPosts}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
        tag={tag}
        hasFeaturedPost={!!featuredPost && !tag}
      />
    </div>
  );
}
