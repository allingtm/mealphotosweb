import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revealSchema } from '@/lib/validations';
import { verifyActiveSubscription } from '@/lib/subscription';

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 2. Verify active subscription
    const sub = await verifyActiveSubscription(user.id, supabase);
    if (!sub.active) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const body = await req.json();
    const parsed = revealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { revealed } = parsed.data;

    // 4. Update all restaurant meals
    const { count } = await supabase
      .from('meals')
      .update({ restaurant_revealed: revealed })
      .eq('user_id', user.id)
      .eq('is_restaurant_meal', true);

    return NextResponse.json({
      success: true,
      revealed,
      meals_updated: count ?? 0,
    });
  } catch (err) {
    console.error('Reveal error:', err);
    return NextResponse.json(
      { error: 'Failed to update reveal status' },
      { status: 500 }
    );
  }
}
