import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_PUSHES_PER_DAY = 3;

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

async function checkFrequencyCap(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("push_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("sent_at", today.toISOString());

  return (count ?? 0) < MAX_PUSHES_PER_DAY;
}

async function logPush(userId: string): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from("push_log").insert({ user_id: userId });
}

async function sendPush(req: PushRequest): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log("OneSignal not configured, skipping push");
    return false;
  }

  const withinCap = await checkFrequencyCap(req.user_id);
  if (!withinCap) {
    console.log(`Push frequency cap reached for user ${req.user_id}`);
    return false;
  }

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [req.user_id],
      headings: { en: req.title },
      contents: { en: req.body },
      ...(req.url ? { url: req.url } : {}),
      ...(req.data ? { data: req.data } : {}),
    }),
  });

  if (response.ok) {
    await logPush(req.user_id);
    return true;
  }

  console.error("OneSignal API error:", await response.text());
  return false;
}

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as PushRequest | PushRequest[];
    const requests = Array.isArray(payload) ? payload : [payload];

    const results = await Promise.allSettled(
      requests.map((r) => sendPush(r))
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;

    return new Response(
      JSON.stringify({ sent, total: requests.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
