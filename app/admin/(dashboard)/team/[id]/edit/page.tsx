import Link from "next/link";
import { notFound } from "next/navigation";
import { archivePlayerAction, restorePlayerAction } from "@/app/admin/(dashboard)/team/actions";
import { PlayerForm } from "@/components/admin/player-form";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { getAdminPlayer } from "@/lib/team/queries";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/news/validation";

export default async function EditPlayerPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const player = await getAdminPlayer(id);
  if (!player) notFound();

  let photoPreviewUrl: string | null = null;
  const supabase = await createClient();
  if (player.photo_media_id) {
    const { data: media, error: mediaError } = await supabase
      .from("media_items")
      .select("storage_path")
      .eq("id", player.photo_media_id)
      .eq("usage_scope", "player_photo")
      .maybeSingle();
    if (mediaError) {
      console.error("Could not load the player photograph preview metadata.", mediaError);
    } else if (media?.storage_path) {
      const { data: signed, error: signedError } = await supabase.storage
        .from("efcc-media")
        .createSignedUrl(media.storage_path, 300);
      if (signedError) console.error("Could not create the player photograph preview.", signedError);
      else photoPreviewUrl = signed.signedUrl;
    }
  }

  return (
    <div>
      <Link href="/admin/team" className="text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:underline">
        Back to First Team
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">First Team</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Edit {player.full_name}</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {player.publication_status === "published" ? "This profile is published." : "This profile is a draft and is not public."}
            {player.archived_at ? " It is currently archived." : ""}
          </p>
        </div>
        {player.archived_at ? (
          <form action={restorePlayerAction}>
            <input type="hidden" name="id" value={player.id} />
            <button type="submit" className="border border-neutral-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider hover:border-[#da291c]">
              Restore player
            </button>
          </form>
        ) : (
          <form action={archivePlayerAction}>
            <input type="hidden" name="id" value={player.id} />
            <button type="submit" className="border border-neutral-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:border-[#da291c]">
              Archive player
            </button>
          </form>
        )}
      </div>
      <div className="mt-7 border border-neutral-200 bg-white p-5 sm:p-8">
        <PlayerForm
          player={player}
          photoPreviewUrl={photoPreviewUrl}
          notice={notice}
        />
      </div>
    </div>
  );
}
