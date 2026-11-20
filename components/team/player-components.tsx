import Image from "next/image";
import Link from "next/link";
import type { PublicPlayerRecord } from "@/lib/team/queries";

function PlayerPhoto({ player, imagePreviewUrl }: { player: PublicPlayerRecord; imagePreviewUrl?: string | null }) {
  const imageUrl = imagePreviewUrl
    ?? (player.photo_media_id ? `/api/team-media/${player.photo_media_id}` : player.photo_url);

  if (!imageUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-100 px-5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500">
        Photograph not provided
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={`${player.full_name} portrait`}
      fill
      unoptimized
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
    />
  );
}

export function PlayerCard({ player }: { player: PublicPlayerRecord }) {
  return (
    <article className="overflow-hidden border border-neutral-200 bg-white">
      <Link href={`/team/${player.slug}`} className="group block" aria-label={`View ${player.full_name}'s profile`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
          <PlayerPhoto player={player} />
        </div>
        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#b51f17]">
            {player.roster_status === "former" ? "Former player" : "First team"}
            {player.position ? ` · ${player.position}` : ""}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold uppercase tracking-tight group-hover:text-[#b51f17]">{player.full_name}</h2>
            {player.shirt_number !== null ? (
              <span className="shrink-0 text-2xl font-extrabold text-neutral-300">{player.shirt_number}</span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function PlayerProfileView({
  player,
  imagePreviewUrl
}: {
  player: PublicPlayerRecord;
  imagePreviewUrl?: string | null;
}) {
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)] lg:items-center">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        <PlayerPhoto player={player} imagePreviewUrl={imagePreviewUrl} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">
          {player.roster_status === "former" ? "Former player" : "First team"}
          {player.position ? ` · ${player.position}` : ""}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">
          {player.full_name}
        </h1>
        {player.shirt_number !== null ? (
          <p className="mt-5 text-2xl font-extrabold text-neutral-400">#{player.shirt_number}</p>
        ) : null}
        {player.nationality ? (
          <p className="mt-3 text-sm font-bold uppercase tracking-wider text-neutral-600">{player.nationality}</p>
        ) : null}
        {player.biography ? (
          <div className="mt-8 border-t border-neutral-200 pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider">Profile</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-600">{player.biography}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
