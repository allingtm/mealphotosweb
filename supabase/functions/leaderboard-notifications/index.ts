import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get all cities with users
  const { data: cityLeaders, error: cityErr } = await supabase
    .from("profiles")
    .select("id, username, location_city, location_country")
    .not("location_city", "is", null);

  if (cityErr || !cityLeaders) {
    return new Response(
      JSON.stringify({ error: cityErr?.message || "No data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const cities = [
    ...new Set(
      cityLeaders.map((u) => u.location_city).filter(Boolean)
    ),
  ];

  const notifications: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    data: Record<string, unknown>;
  }> = [];

  const pushPayloads: Array<{
    user_id: string;
    title: string;
    body: string;
    url: string;
  }> = [];

  for (const city of cities) {
    // Get top 10 meal uploaders in this city by average rating
    const { data: ranked } = await supabase.rpc("get_leaderboard", {
      p_scope: "city",
      p_city: city,
      p_time_range: "this_week",
      p_limit: 10,
      p_offset: 0,
    });

    if (!ranked || ranked.length === 0) continue;

    for (let i = 0; i < ranked.length; i++) {
      const user = ranked[i];
      const rank = i + 1;

      // Deduplicate: don't notify same user about same scope today
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .eq("type", "leaderboard_move")
        .gte("created_at", today + "T00:00:00Z");

      if ((count ?? 0) > 0) continue;

      notifications.push({
        user_id: user.user_id,
        type: "leaderboard_move",
        title: `You're now #${rank} in ${city} this week!`,
        body: "Keep uploading great meals to climb higher.",
        data: { rank, scope: "city", city, time_range: "this_week" },
      });

      pushPayloads.push({
        user_id: user.user_id,
        title: "Leaderboard update!",
        body: `\u{1F3C6} You're now #${rank} in ${city} this week!`,
        url: "https://meal.photos/leaderboard",
      });
    }
  }

  // Batch insert notifications
  if (notifications.length > 0) {
    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertErr) {
      console.error("Failed to insert leaderboard notifications:", insertErr);
    }
  }

  // Send push notifications
  if (pushPayloads.length > 0) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(pushPayloads),
      });
    } catch (err) {
      console.error("Failed to send leaderboard push notifications:", err);
    }
  }

  return new Response(
    JSON.stringify({
      message: "Leaderboard notifications processed",
      notifications_created: notifications.length,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
