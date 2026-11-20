import { NextResponse } from "next/server";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireStaffRole(newsStaffRoles, "/admin/login");
  const { id } = await params;
  if (!uuidPattern.test(id)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: media, error } = await supabase
    .from("media_items")
    .select("storage_path")
    .eq("id", id)
    .eq("media_type", "image")
    .eq("usage_scope", "library")
    .maybeSingle();
  if (error) {
    console.error("Could not load admin news media.", error);
    return new Response("Media is temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!media?.storage_path) return new Response("Not found", { status: 404 });

  const { data: signed, error: signedError } = await supabase.storage
    .from("efcc-media")
    .createSignedUrl(media.storage_path, 300);
  if (signedError || !signed?.signedUrl) {
    console.error("Could not sign admin news media.", signedError);
    return new Response("Media is temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 307, headers: { "Cache-Control": "no-store" } });
}
