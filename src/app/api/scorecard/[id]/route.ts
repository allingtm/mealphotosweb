import { NextRequest, NextResponse } from 'next/server';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@/lib/supabase/server';

// Format dimensions
const FORMATS: Record<string, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

// Cache fonts in module scope
let fontCache: { instrumentSerif: ArrayBuffer; dmSans: ArrayBuffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;

  const [instrumentSerifRes, dmSansRes] = await Promise.all([
    fetch(
      'https://fonts.gstatic.com/s/instrumentserif/v4/jizBRFtNs2ka5fCnGE3g8PZUgl3g0TtB.ttf'
    ),
    fetch(
      'https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop1hTmf3ZGMZpg.ttf'
    ),
  ]);

  fontCache = {
    instrumentSerif: await instrumentSerifRes.arrayBuffer(),
    dmSans: await dmSansRes.arrayBuffer(),
  };

  return fontCache;
}

function getScoreColor(score: number): string {
  if (score <= 3) return '#D4553A';
  if (score <= 5) return '#E8A838';
  if (score <= 7) return '#F5F0E8';
  return '#4CAF50';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid meal ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'square';

  const dimensions = FORMATS[format];
  if (!dimensions) {
    return NextResponse.json(
      { error: 'Invalid format. Use: square, portrait, or story' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: meal, error } = await supabase
    .from('meals')
    .select(
      '*, profiles!meals_user_id_fkey(username, display_name, avatar_url, location_city)'
    )
    .eq('id', id)
    .single();

  if (error || !meal) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  // Prevent scorecard generation for private meals
  if (meal.visibility === 'private') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const profile = meal.profiles as unknown as {
    username: string;
    display_name: string | null;
    location_city: string | null;
  };

  const score = Number(meal.avg_rating);
  const scoreColor = getScoreColor(score);
  const { width, height } = dimensions;

  // Calculate layout proportions based on format
  const photoHeight = format === 'story' ? Math.round(height * 0.5) : Math.round(height * 0.55);
  const contentPadding = 48;

  let fonts;
  try {
    fonts = await loadFonts();
  } catch {
    return NextResponse.json(
      { error: 'Failed to load fonts' },
      { status: 500 }
    );
  }

  // Fetch the meal photo as base64 for embedding in the SVG
  let photoBase64 = '';
  try {
    const photoRes = await fetch(meal.photo_url);
    const photoBuffer = await photoRes.arrayBuffer();
    const base64 = Buffer.from(photoBuffer).toString('base64');
    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
    photoBase64 = `data:${contentType};base64,${base64}`;
  } catch {
    // If photo fetch fails, use a dark placeholder
    photoBase64 = '';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element: any = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#121212',
      },
      children: [
        // Meal photo
        photoBase64
          ? {
              type: 'img',
              props: {
                src: photoBase64,
                width: width,
                height: photoHeight,
                style: {
                  objectFit: 'cover',
                  width: '100%',
                  height: photoHeight,
                },
              },
            }
          : {
              type: 'div',
              props: {
                style: {
                  width: '100%',
                  height: photoHeight,
                  backgroundColor: '#1E1E1E',
                },
              },
            },
        // Content area
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              padding: contentPadding,
            },
            children: [
              // Score + details
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  },
                  children: [
                    // Score row
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 12,
                        },
                        children: [
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontFamily: 'Instrument Serif',
                                fontSize: 72,
                                color: scoreColor,
                                lineHeight: 1,
                              },
                              children:
                                meal.rating_count > 0
                                  ? score.toFixed(1)
                                  : '—',
                            },
                          },
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontFamily: 'DM Sans',
                                fontSize: 20,
                                color: '#888888',
                              },
                              children: 'out of 10',
                            },
                          },
                        ],
                      },
                    },
                    // Title
                    {
                      type: 'p',
                      props: {
                        style: {
                          fontFamily: 'Instrument Serif',
                          fontSize: 32,
                          color: '#F5F0E8',
                          lineHeight: 1.2,
                          margin: 0,
                        },
                        children: meal.title,
                      },
                    },
                    // Author + location
                    {
                      type: 'p',
                      props: {
                        style: {
                          fontFamily: 'DM Sans',
                          fontSize: 18,
                          color: '#888888',
                          margin: 0,
                        },
                        children: [
                          `@${profile.username}`,
                          profile.location_city
                            ? ` · ${profile.location_city}`
                            : '',
                        ].join(''),
                      },
                    },
                  ],
                },
              },
              // Branding footer
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontFamily: 'Instrument Serif',
                          fontSize: 24,
                          color: '#F5F0E8',
                        },
                        children: 'meal.photos',
                      },
                    },
                    {
                      type: 'span',
                      props: {
                        style: {
                          fontFamily: 'DM Sans',
                          fontSize: 18,
                          fontWeight: 600,
                          color: '#E8A838',
                        },
                        children: 'Rate my meal →',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  try {
    const svg = await satori(element, {
      width,
      height,
      fonts: [
        {
          name: 'Instrument Serif',
          data: fonts.instrumentSerif,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'DM Sans',
          data: fonts.dmSans,
          weight: 400,
          style: 'normal',
        },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('Scorecard render error:', err);
    return NextResponse.json(
      { error: 'Failed to generate scorecard' },
      { status: 500 }
    );
  }
}
