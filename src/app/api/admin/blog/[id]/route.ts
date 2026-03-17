import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { updateBlogPostSchema } from '@/lib/validations/blog';
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await context.params;

    const rateLimitResponse = await applyRateLimit(user.id, 'read');
    if (rateLimitResponse) return rateLimitResponse;

    const serviceClient = createServiceRoleClient();
    const { data: post, error } = await serviceClient
      .from('blog_posts')
      .select('*, profiles!inner(display_name, username)')
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Fetch tags
    const { data: postTags } = await serviceClient
      .from('blog_post_tags')
      .select('blog_tags(id, name, slug)')
      .eq('blog_post_id', id);

    const tags = (postTags ?? [])
      .map(pt => pt.blog_tags as unknown as { id: string; name: string; slug: string })
      .filter(Boolean);

    return NextResponse.json({
      data: { ...post, author: post.profiles, tags, profiles: undefined },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await context.params;

    const rateLimitResponse = await applyRateLimit(user.id, 'write');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = updateBlogPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tag_ids, ...updateData } = parsed.data;
    const serviceClient = createServiceRoleClient();

    // Check if publishing for the first time
    if (updateData.published === true) {
      const { data: existing } = await serviceClient
        .from('blog_posts')
        .select('published, published_at')
        .eq('id', id)
        .single();

      if (existing && !existing.published && !existing.published_at) {
        (updateData as Record<string, unknown>).published_at = new Date().toISOString();
      }
    }

    const { data: post, error } = await serviceClient
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A blog post with this slug already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    // Update tags if provided
    if (tag_ids !== undefined) {
      await serviceClient
        .from('blog_post_tags')
        .delete()
        .eq('blog_post_id', id);

      if (tag_ids.length > 0) {
        await serviceClient
          .from('blog_post_tags')
          .insert(tag_ids.map(tag_id => ({ blog_post_id: id, blog_tag_id: tag_id })));
      }
    }

    return NextResponse.json({ data: post });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await context.params;

    const rateLimitResponse = await applyRateLimit(user.id, 'write');
    if (rateLimitResponse) return rateLimitResponse;

    const serviceClient = createServiceRoleClient();

    // Best-effort Cloudflare image cleanup
    const { data: post } = await serviceClient
      .from('blog_posts')
      .select('og_image_id')
      .eq('id', id)
      .single();

    if (post?.og_image_id) {
      const CF_ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID;
      const CF_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
      if (CF_ACCOUNT_ID && CF_API_TOKEN) {
        fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${post.og_image_id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
        ).catch(() => {});
      }
    }

    const { error } = await serviceClient
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
