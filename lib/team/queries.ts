import { createClient } from "@/lib/supabase/server";
import type { RosterStatus } from "@/lib/team/validation";

const pageSize = 12;

export type PlayerPublicationStatus = "draft" | "published";
export type PlayerListFilter = "all" | "current" | "former" | "needs_review" | "draft" | "published" | "archived";

export type PlayerRecord = {
  id: string;
  full_name: string;
  slug: string;
  shirt_number: number | null;
  position: string | null;
  nationality: string | null;
  biography: string | null;
  photo_url: string | null;
  photo_media_id: string | null;
  is_active: boolean;
  roster_status: RosterStatus;
  publication_status: PlayerPublicationStatus;
  published_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
};

const adminPlayerFields = "id,full_name,slug,shirt_number,position,nationality,biography,photo_url,photo_media_id,is_active,roster_status,publication_status,published_at,archived_at,archived_by,created_at,updated_at";
const publicPlayerFields = "id,full_name,slug,shirt_number,position,nationality,biography,photo_url,photo_media_id,is_active,roster_status,publication_status,published_at,archived_at,created_at,updated_at";

export class PlayerQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerQueryError";
  }
}

export async function getAdminPlayers({
  search = "",
  filter = "all",
  page = 1
}: {
  search?: string;
  filter?: PlayerListFilter;
  page?: number;
}) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const safeSearch = search.trim().slice(0, 100).replace(/[%_]/g, "\\$&");
  const supabase = await createClient();
  let query = supabase
    .from("players")
    .select(adminPlayerFields, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((safePage - 1) * pageSize, safePage * pageSize - 1);

  if (safeSearch) query = query.ilike("full_name", `%${safeSearch}%`);
  if (filter === "archived") {
    query = query.not("archived_at", "is", null);
  } else if (filter !== "all") {
    query = query.is("archived_at", null);
    if (filter === "current" || filter === "former" || filter === "needs_review") {
      query = query.eq("roster_status", filter);
    } else {
      query = query.eq("publication_status", filter);
    }
  }

  const { data, count, error } = await query;
  if (error) throw new PlayerQueryError(`Could not load players: ${error.message}`);

  return {
    players: data as PlayerRecord[],
    total: count ?? 0,
    page: safePage,
    pageSize
  };
}

export async function getAdminPlayer(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(adminPlayerFields)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new PlayerQueryError(`Could not load the player: ${error.message}`);
  return data as PlayerRecord | null;
}

export async function getPublishedPlayers(rosterStatus: "current" | "former") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(publicPlayerFields)
    .eq("publication_status", "published")
    .eq("roster_status", rosterStatus)
    .is("archived_at", null)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });

  if (error) throw new PlayerQueryError(`Could not load the ${rosterStatus} squad: ${error.message}`);
  return data as PlayerRecord[];
}

export async function getPublishedPlayerBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(publicPlayerFields)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .is("archived_at", null)
    .in("roster_status", ["current", "former"])
    .maybeSingle();

  if (error) throw new PlayerQueryError(`Could not load the player profile: ${error.message}`);
  return data as PlayerRecord | null;
}

export const PLAYER_PAGE_SIZE = pageSize;
