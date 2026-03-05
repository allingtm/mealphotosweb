import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encode } from "npm:blurhash";
import { decode as decodeJpeg } from "npm:jpeg-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VISION_API_KEY = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY")!;
const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

const FOOD_LABELS = new Set([
  "food", "dish", "cuisine", "recipe", "ingredient", "meal", "snack",
  "dessert", "baked goods", "produce", "seafood", "meat", "vegetable",
  "fruit", "fast food", "breakfast", "lunch", "dinner", "beverage",
  "drink", "soup", "salad", "bread", "pasta", "rice", "cake", "pie",
  "sandwich", "pizza", "sushi", "steak", "curry", "noodle", "taco",
  "burger", "ice cream", "chocolate", "cheese", "egg dish",
]);

const HIGH_RISK = ["VERY_LIKELY"];
const MEDIUM_RISK = ["LIKELY", "POSSIBLE"];
const SAFETY_CATEGORIES = ["adult", "violence", "racy"];

async function generateBlurhash(imageUrl: string): Promise<string | null> {
  const thumbnailUrl = imageUrl.replace("/public", "/thumbnail");
  const res = await fetch(thumbnailUrl, {
    headers: { Accept: "image/jpeg" },
  });

  if (!res.ok) {
    console.error("Thumbnail fetch failed:", res.status);
    return null;
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  const image = decodeJpeg(buffer, { useTArray: true, formatAsRGBA: true });
  return encode(image.data, image.width, image.height, 4, 3);
}

Deno.serve(async (req: Request) => {
  try {
    const { meal_id, image_url, user_id, force_vision } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Start blurhash generation in parallel
    const blurhashPromise = generateBlurhash(image_url).catch((err) => {
      console.error("Blurhash generation failed:", err);
      return null;
    });

    // Look up user's moderation tier
    let tier = "new";
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("moderation_tier")
        .eq("id", user_id)
        .single();
      tier = profile?.moderation_tier ?? "new";
    }

    // Trusted users: skip Cloud Vision, auto-approve (unless force_vision)
    if (tier === "trusted" && !force_vision) {
      await supabase.from("meal_moderation").update({
        status: "approved",
        moderation_labels: { reason: "trusted_auto_approve" },
        cloud_vision_checked: false,
      }).eq("meal_id", meal_id);

      const blurhash = await blurhashPromise;
      if (blurhash) {
        await supabase.from("meals").update({ photo_blur_hash: blurhash }).eq("id", meal_id);
      }

      console.log(JSON.stringify({
        event: "moderation_skipped",
        user_id,
        meal_id,
        moderation_tier: "trusted",
      }));

      return new Response(
        JSON.stringify({ status: "approved", skipped: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // New, flagged, or force_vision: call Cloud Vision API
    const visionRes = await fetch(`${VISION_API_URL}?key=${VISION_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: image_url } },
            features: [
              { type: "SAFE_SEARCH_DETECTION" },
              { type: "LABEL_DETECTION", maxResults: 20 },
            ],
          },
        ],
      }),
    });

    if (!visionRes.ok) {
      console.error("Vision API HTTP error:", visionRes.status);
      await supabase.from("meal_moderation").update({
        status: "manual_review",
        moderation_labels: { reason: "vision_api_error", httpStatus: visionRes.status },
        cloud_vision_checked: true,
      }).eq("meal_id", meal_id);

      const blurhash = await blurhashPromise;
      if (blurhash) {
        await supabase.from("meals").update({ photo_blur_hash: blurhash }).eq("id", meal_id);
      }

      return new Response(
        JSON.stringify({ status: "manual_review", reason: "vision_api_error" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const visionData = await visionRes.json();
    const annotation = visionData.responses?.[0];

    if (annotation?.error) {
      console.error("Vision API annotation error:", annotation.error);
      await supabase.from("meal_moderation").update({
        status: "manual_review",
        moderation_labels: { reason: "vision_api_error", error: annotation.error },
        cloud_vision_checked: true,
      }).eq("meal_id", meal_id);

      const blurhash = await blurhashPromise;
      if (blurhash) {
        await supabase.from("meals").update({ photo_blur_hash: blurhash }).eq("id", meal_id);
      }

      return new Response(
        JSON.stringify({ status: "manual_review", reason: "vision_api_error" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const safeSearch = annotation.safeSearchAnnotation || {};
    const labels = annotation.labelAnnotations || [];

    // Gate 1: Safety (SafeSearch)
    const highRiskFlag = SAFETY_CATEGORIES.some((cat) => HIGH_RISK.includes(safeSearch[cat]));
    const mediumRiskFlag = SAFETY_CATEGORIES.some((cat) => MEDIUM_RISK.includes(safeSearch[cat]));

    // Compute food score once for both gate 2 and moderation labels
    const matchedFoodScores = labels
      .filter((l: { description: string }) => FOOD_LABELS.has(l.description.toLowerCase()))
      .map((l: { score: number }) => l.score);
    const foodScore = matchedFoodScores.length > 0 ? Math.max(...matchedFoodScores) : 0;

    let status: string;
    let reason: string | undefined;

    if (highRiskFlag) {
      status = "rejected";
      reason = "safety_high_confidence";
    } else if (mediumRiskFlag) {
      status = "manual_review";
      reason = "safety_medium_confidence";
    } else if (foodScore < 0.7) {
      // Gate 2: Food detection
      status = "rejected";
      reason = "not_food";
    } else {
      status = "approved";
    }

    // Update moderation row
    const moderationLabels: Record<string, unknown> = { safeSearch, labels, foodScore };
    if (reason) moderationLabels.reason = reason;

    await supabase.from("meal_moderation").update({
      status,
      moderation_labels: moderationLabels,
      cloud_vision_checked: true,
    }).eq("meal_id", meal_id);

    console.log(JSON.stringify({
      event: "moderation_checked",
      user_id,
      meal_id,
      moderation_tier: tier,
      result: status,
    }));

    // Await blurhash and update meal row
    const blurhash = await blurhashPromise;
    if (blurhash) {
      await supabase.from("meals").update({ photo_blur_hash: blurhash }).eq("id", meal_id);
    }

    return new Response(
      JSON.stringify({ status, reason }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
