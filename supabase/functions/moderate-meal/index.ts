import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VISION_API_KEY = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY")!;
const EDGE_FUNCTION_SECRET = Deno.env.get("EDGE_FUNCTION_SECRET")!;
const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

const HIGH_RISK = ["VERY_LIKELY"];
const MEDIUM_RISK = ["LIKELY", "POSSIBLE"];
const SAFETY_CATEGORIES = ["adult", "violence", "racy"];

Deno.serve(async (req: Request) => {
  // Verify secret
  const secret = req.headers.get("x-edge-secret");
  if (secret !== EDGE_FUNCTION_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { dish_id, photo_url } = await req.json();
    if (!dish_id || !photo_url) {
      return new Response(
        JSON.stringify({ error: "dish_id and photo_url required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download image and convert to base64 (Cloudflare Images URLs need fetching)
    const imageRes = await fetch(photo_url);
    if (!imageRes.ok) {
      console.error("Image fetch failed:", imageRes.status);
      await supabase.from("dish_moderation").upsert({
        dish_id,
        status: "flagged",
        safety_labels: { reason: "image_fetch_failed" },
      });
      return new Response(
        JSON.stringify({ status: "flagged", reason: "image_fetch_failed" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    // Call Google Cloud Vision SafeSearch API (SafeSearch only — no food detection)
    const visionRes = await fetch(`${VISION_API_URL}?key=${VISION_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: "SAFE_SEARCH_DETECTION" }],
        }],
      }),
    });

    if (!visionRes.ok) {
      console.error("Vision API error:", visionRes.status);
      await supabase.from("dish_moderation").upsert({
        dish_id,
        status: "flagged",
        safety_labels: { reason: "vision_api_error" },
      });
      return new Response(
        JSON.stringify({ status: "flagged", reason: "vision_api_error" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const visionData = await visionRes.json();
    const safeSearch = visionData.responses?.[0]?.safeSearchAnnotation;

    if (!safeSearch) {
      await supabase.from("dish_moderation").upsert({
        dish_id,
        status: "approved",
        safety_labels: { reason: "no_safesearch_data" },
      });
      return new Response(
        JSON.stringify({ status: "approved" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Check SafeSearch results
    let status: "approved" | "flagged" | "rejected" = "approved";

    for (const category of SAFETY_CATEGORIES) {
      const level = safeSearch[category];
      if (HIGH_RISK.includes(level)) {
        status = "rejected";
        break;
      }
      if (MEDIUM_RISK.includes(level)) {
        status = "flagged";
      }
    }

    // Store moderation result
    await supabase.from("dish_moderation").upsert({
      dish_id,
      status,
      safety_labels: safeSearch,
    });

    // If rejected, delete the dish
    if (status === "rejected") {
      await supabase.from("dishes").delete().eq("id", dish_id);
      console.log(JSON.stringify({ event: "dish_rejected", dish_id }));
    }

    console.log(JSON.stringify({ event: "moderation_complete", dish_id, status }));

    return new Response(
      JSON.stringify({ status }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Moderation error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
