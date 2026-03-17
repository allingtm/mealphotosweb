import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createBlogPostSchema, blogPostQuerySchema } from '@/lib/validations/blog';
import { generateSlug } from '@/lib/utils';
import { applyRateLimit } from '@/lib/rate-limit';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimitResponse = await applyRateLimit(user.id, 'read');
    if (rateLimitResponse) return rateLimitResponse;

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = blogPostQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, per_page, published } = parsed.data;
    const offset = (page - 1) * per_page;

    const serviceClient = createServiceRoleClient();
    let query = serviceClient
      .from('blog_posts')
      .select('*, profiles!inner(display_name, username)', { count: 'exact' });

    if (published === 'true') query = query.eq('published', true);
    else if (published === 'false') query = query.eq('published', false);

    const { data: posts, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch tags for each post
    const postIds = (posts ?? []).map(p => p.id);
    let tagsByPost: Record<string, { id: string; name: string; slug: string }[]> = {};

    if (postIds.length > 0) {
      const { data: postTags } = await serviceClient
        .from('blog_post_tags')
        .select('blog_post_id, blog_tags(id, name, slug)')
        .in('blog_post_id', postIds);

      if (postTags) {
        for (const pt of postTags) {
          if (!tagsByPost[pt.blog_post_id]) tagsByPost[pt.blog_post_id] = [];
          const tag = pt.blog_tags as unknown as { id: string; name: string; slug: string };
          if (tag) tagsByPost[pt.blog_post_id].push(tag);
        }
      }
    }

    const data = (posts ?? []).map(post => ({
      ...post,
      author: post.profiles,
      tags: tagsByPost[post.id] ?? [],
      profiles: undefined,
    }));

    return NextResponse.json({ data, total: count, page, per_page });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const rateLimitResponse = await applyRateLimit(user.id, 'write');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = createBlogPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tag_ids, ...postData } = parsed.data;
    const slug = postData.slug || generateSlug(postData.title);

    const serviceClient = createServiceRoleClient();
    const { data: post, error } = await serviceClient
      .from('blog_posts')
      .insert({
        ...postData,
        slug,
        author_id: user.id,
        published_at: postData.published ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A blog post with this slug already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (tag_ids && tag_ids.length > 0) {
      await serviceClient
        .from('blog_post_tags')
        .insert(tag_ids.map(tag_id => ({ blog_post_id: post.id, blog_tag_id: tag_id })));
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
