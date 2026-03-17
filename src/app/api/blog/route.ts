import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicBlogQuerySchema } from '@/lib/validations/blog';
import { applyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anon';
    const rateLimitResponse = await applyRateLimit(ip, 'read');
    if (rateLimitResponse) return rateLimitResponse;

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = publicBlogQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cursor, limit, tag } = parsed.data;
    const supabase = await createClient();

    // If filtering by tag, resolve tag ID first then filter posts
    let postIdFilter: string[] | null = null;
    if (tag) {
      const { data: tagData } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tag)
        .single();

      if (!tagData) {
        return NextResponse.json({ data: [], nextCursor: null, hasMore: false });
      }

      const { data: postTagLinks } = await supabase
        .from('blog_post_tags')
        .select('blog_post_id')
        .eq('blog_tag_id', tagData.id);

      postIdFilter = (postTagLinks ?? []).map(pt => pt.blog_post_id);
      if (postIdFilter.length === 0) {
        return NextResponse.json({ data: [], nextCursor: null, hasMore: false });
      }
    }

    // Query published posts (RLS also enforces published=true, but explicit for defense-in-depth)
    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, og_image_url, featured, published_at, created_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit + 1);

    if (postIdFilter) {
      query = query.in('id', postIdFilter);
    }

    if (cursor) {
      query = query.lt('published_at', cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = posts ?? [];
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;

    // Fetch tags for returned posts
    const postIds = data.map(p => p.id);
    const tagsByPost: Record<string, { id: string; name: string; slug: string }[]> = {};

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

    const enriched = data.map(p => ({ ...p, tags: tagsByPost[p.id] ?? [] }));

    return NextResponse.json({
      data: enriched,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].published_at : null,
      hasMore,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
