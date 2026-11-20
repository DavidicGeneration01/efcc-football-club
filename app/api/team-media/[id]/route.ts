import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("photo_media_id", id)
    .eq("publication_status", "published")
    .in("roster_status", ["current", "former"])
    .is("archived_at", null)
    .maybeSingle();

  if (playerError) {
    console.error("Could not verify the published player photograph.", playerError);
    return new Response("Player photograph is temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
  if (!player) return new Response("Not found", { status: 404 });

  const { data: media, error: mediaError } = await supabase
    .from("media_items")
    .select("storage_path")
    .eq("id", id)
    .eq("usage_scope", "player_photo")
    .eq("media_type", "image")
    .maybeSingle();

  if (mediaError) {
    console.error("Could not load the published player photograph.", mediaError);
    return new Response("Player photograph is temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
  if (!media?.storage_path) return new Response("Not found", { status: 404 });

  const { data: signed, error: signedError } = await supabase.storage
    .from("efcc-media")
    .createSignedUrl(media.storage_path, 120);

  if (signedError) {
    console.error("Could not create a public player photograph URL.", signedError);
    return new Response("Player photograph is temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 307,
    headers: { "Cache-Control": "no-store" }
  });
}
