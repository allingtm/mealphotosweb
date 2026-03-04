import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find users with streak >= 3 who haven't uploaded today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, streak_current, streak_last_upload")
    .gte("streak_current", 3)
    .neq("streak_last_upload", todayStr);

  if (error) {
    console.error("Failed to query profiles:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!users || users.length === 0) {
    return new Response(
      JSON.stringify({ message: "No users to remind", count: 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const notifications = users.map((user) => ({
    user_id: user.id,
    type: "streak_reminder",
    title: `Don't lose your ${user.streak_current}-day streak!`,
    body: "Upload a meal today to keep it going.",
    data: { streak_current: user.streak_current },
  }));

  // Batch insert in-app notifications
  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (insertError) {
    console.error("Failed to insert notifications:", insertError);
  }

  // Send push notifications via the send-push-notification function
  const pushPayloads = users.map((user) => ({
    user_id: user.id,
    title: "Don't lose your streak!",
    body: `\u{1F525} Don't lose your ${user.streak_current}-day streak! Upload a meal today.`,
    url: "https://meal.photos/upload",
  }));

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
    console.error("Failed to send push notifications:", err);
  }

  // Send Resend emails for users with streak >= 7
  if (RESEND_API_KEY) {
    const emailUsers = users.filter((u) => u.streak_current >= 7);

    for (const user of emailUsers) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        user.id
      );
      const email = authUser?.user?.email;
      if (!email) continue;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "meal.photos <noreply@meal.photos>",
            to: email,
            subject: `Your ${user.streak_current}-day streak is at risk!`,
            html: `
              <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #121212; color: #F5F0E8;">
                <h1 style="font-family: 'Instrument Serif', serif; color: #E8A838; font-size: 28px; margin-bottom: 16px;">\u{1F525} Don't lose your streak!</h1>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">You've been on a <strong style="color: #E8A838;">${user.streak_current}-day streak</strong> uploading meals. Don't let it end today!</p>
                <a href="https://meal.photos/upload" style="display: inline-block; background: #E8A838; color: #121212; padding: 12px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px;">Upload a Meal</a>
                <p style="font-size: 12px; color: #888888; margin-top: 32px;">You're receiving this because you have an active streak on meal.photos.</p>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
      }
    }
  }

  return new Response(
    JSON.stringify({ message: "Streak reminders sent", count: users.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
