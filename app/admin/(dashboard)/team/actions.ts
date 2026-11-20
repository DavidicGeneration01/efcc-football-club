"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { parsePlayerInput } from "@/lib/team/validation";
import { createClient } from "@/lib/supabase/server";

export type PlayerSaveState = {
  status: "idle" | "error";
  message: string;
};

function refreshPlayerPaths(slug?: string) {
  revalidatePath("/admin/team");
  revalidatePath("/team");
  revalidatePath("/team/former");
  if (slug) revalidatePath(`/team/${slug}`);
}

export async function savePlayerAction(
  _previousState: PlayerSaveState,
  formData: FormData
): Promise<PlayerSaveState> {
  await requireStaffRole(newsStaffRoles, "/admin");

  const parsed = parsePlayerInput(formData);
  if (!parsed.success) return { status: "error", message: parsed.message };
  const input = parsed.data;
  if (input.intent === "publish" && input.rosterStatus === "needs_review") {
    return { status: "error", message: "Classify this player as current or former before publishing." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  let playerId = input.id;
  let previousSlug: string | null = null;
  let publicationStatus: "draft" | "published" = input.intent === "publish" ? "published" : "draft";
  let publishedAt: string | null = publicationStatus === "published" ? now : null;

  if (input.id) {
    const { data: existing, error: existingError } = await supabase
      .from("players")
      .select("slug,publication_status,published_at")
      .eq("id", input.id)
      .maybeSingle();
    if (existingError) return { status: "error", message: `Player could not be loaded: ${existingError.message}` };
    if (!existing) return { status: "error", message: "The player was not found or you do not have permission to edit it." };

    previousSlug = existing.slug;
    publicationStatus = input.rosterStatus === "needs_review"
      ? "draft"
      : input.intent === "publish"
        ? "published"
        : input.intent === "draft"
          ? "draft"
          : existing.publication_status;
    publishedAt = publicationStatus === "published"
      ? existing.published_at ?? now
      : null;

    const { data, error } = await supabase
      .from("players")
      .update({
        full_name: input.fullName,
        slug: input.slug,
        shirt_number: input.shirtNumber,
        position: input.position,
        nationality: input.nationality,
        biography: input.biography,
        roster_status: input.rosterStatus,
        is_active: input.rosterStatus === "current",
        publication_status: publicationStatus,
        published_at: publishedAt,
        updated_at: now
      })
      .eq("id", input.id)
      .select("id,slug")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return { status: "error", message: "That profile slug is already in use." };
      console.error("Could not save the player.", error);
      return { status: "error", message: `Player could not be saved: ${error.message}` };
    }
    if (!data) return { status: "error", message: "The player was not saved. Check your access and try again." };
    playerId = data.id;
  } else {
    const { data, error } = await supabase
      .from("players")
      .insert({
        full_name: input.fullName,
        slug: input.slug,
        shirt_number: input.shirtNumber,
        position: input.position,
        nationality: input.nationality,
        biography: input.biography,
        roster_status: input.rosterStatus,
        is_active: input.rosterStatus === "current",
        publication_status: publicationStatus,
        published_at: publishedAt,
        updated_at: now
      })
      .select("id,slug")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return { status: "error", message: "That profile slug is already in use." };
      console.error("Could not create the player.", error);
      return { status: "error", message: `Player could not be created: ${error.message}` };
    }
    if (!data) return { status: "error", message: "The player was not created. Check your access and try again." };
    playerId = data.id;
  }

  if (!playerId) return { status: "error", message: "The player record could not be identified after saving." };
  refreshPlayerPaths(previousSlug ?? undefined);
  refreshPlayerPaths(input.slug);

  redirect(`/admin/team/${playerId}/edit?notice=${input.intent === "publish" ? "published" : "saved"}`);
}

async function readPlayerId(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/admin/team?notice=invalid");
  }
  return id;
}

export async function archivePlayerAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const id = await readPlayerId(formData);
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the staff member archiving the player.", authError);
    redirect("/admin/team?notice=archive-error");
  }
  const timestamp = new Date().toISOString();
  const { data: player, error: readError } = await supabase
    .from("players")
    .select("slug")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (readError) {
    console.error("Could not load the player before archiving.", readError);
    redirect("/admin/team?notice=archive-error");
  }
  if (!player) redirect("/admin/team?notice=not-found");

  const { data, error } = await supabase
    .from("players")
    .update({
      archived_at: timestamp,
      archived_by: authData.user.id,
      updated_at: timestamp
    })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not archive the player.", error);
    redirect("/admin/team?notice=archive-error");
  }
  if (!data) redirect("/admin/team?notice=not-found");

  refreshPlayerPaths(player.slug);
  redirect("/admin/team?notice=archived");
}

export async function restorePlayerAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const id = await readPlayerId(formData);
  const supabase = await createClient();
  const { data: player, error: readError } = await supabase
    .from("players")
    .select("slug")
    .eq("id", id)
    .not("archived_at", "is", null)
    .maybeSingle();

  if (readError) {
    console.error("Could not load the player before restoring.", readError);
    redirect("/admin/team?notice=restore-error");
  }
  if (!player) redirect("/admin/team?notice=not-found");

  const { data, error } = await supabase
    .from("players")
    .update({ archived_at: null, archived_by: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .not("archived_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not restore the player.", error);
    redirect("/admin/team?notice=restore-error");
  }
  if (!data) redirect("/admin/team?notice=not-found");

  refreshPlayerPaths(player.slug);
  redirect("/admin/team?notice=restored");
}
