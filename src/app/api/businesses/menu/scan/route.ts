import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/rate-limit';
import { resolveBusinessContext } from '@/lib/team';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimited = await applyRateLimit(user.id, 'upload');
  if (rateLimited) return rateLimited;

  const ctx = await resolveBusinessContext(supabase, user.id);
  if (!ctx || !ctx.permissions.can_manage_menu) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const formData = await req.formData();
  const image = formData.get('image') as File;
  if (!image) return NextResponse.json({ error: 'Image required' }, { status: 400 });

  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image exceeds 10MB limit' }, { status: 413 });
  }

  const buffer = await image.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/webp';

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          {
            type: 'text',
            text: `Extract all menu items from this menu photo. Return a JSON object with sections and items.

Format:
{
  "sections": [
    {
      "name": "Section Name (e.g., Starters, Mains, Desserts, Drinks)",
      "items": [
        {
          "name": "Item name",
          "description": "Brief description if visible",
          "price_pence": 1695,
          "dietary_tags": ["V", "GF"]
        }
      ]
    }
  ]
}

Rules:
- Convert prices to pence (£16.95 → 1695)
- Only include dietary tags if explicitly marked (V=Vegetarian, VG=Vegan, GF=Gluten Free, DF=Dairy Free)
- If no price is visible, set price_pence to null
- If no description is visible, set description to null
- Return valid JSON only, no markdown fences`,
          },
        ],
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Failed to extract menu' }, { status: 500 });
    }

    // Try to parse — handle potential markdown fences
    let text = content.text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const extracted = JSON.parse(text);
    return NextResponse.json({ extracted });
  } catch (err) {
    console.error('Menu scan error:', err);
    return NextResponse.json({ error: 'Failed to process menu scan' }, { status: 500 });
  }
}
