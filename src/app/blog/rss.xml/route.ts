import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, published_at, created_at, og_image_url')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (posts ?? []).map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>https://meal.photos/blog/${post.slug}</link>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <pubDate>${new Date(post.published_at || post.created_at).toUTCString()}</pubDate>
      <guid isPermaLink="true">https://meal.photos/blog/${post.slug}</guid>
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>meal.photos Blog</title>
    <link>https://meal.photos/blog</link>
    <description>Stories, tips, and updates from the meal.photos community.</description>
    <language>en</language>
    <atom:link href="https://meal.photos/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
