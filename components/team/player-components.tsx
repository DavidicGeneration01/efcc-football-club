import Image from "next/image";
import Link from "next/link";
import type { PublicPlayerRecord } from "@/lib/team/queries";

function imageUrl(player: PublicPlayerRecord, imagePreviewUrl?: string | null) {
  return imagePreviewUrl
    ?? (player.photo_media_id ? `/api/team-media/${player.photo_media_id}` : player.photo_url);
}

function PlayerPhoto({ player, imagePreviewUrl }: { player: PublicPlayerRecord; imagePreviewUrl?: string | null }) {
  const src = imageUrl(player, imagePreviewUrl);
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-100 px-5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500">
        Photograph not provided
      </div>
    );
  }

  return (
    <Image
      src={src}
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
    <article className="group overflow-hidden border border-neutral-200 bg-white transition-colors duration-200 hover:border-[#da291c] hover:bg-[#da291c]">
      <Link href={`/team/${player.slug}`} className="block" aria-label={`View ${player.full_name}'s profile`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
          <PlayerPhoto player={player} />
          {player.shirt_number !== null ? (
            <span aria-hidden="true" className="absolute bottom-0 right-3 text-7xl font-black leading-none text-white/75 drop-shadow sm:text-8xl">
              {player.shirt_number}
            </span>
          ) : null}
        </div>
        <div className="min-h-32 p-5 text-neutral-950 transition-colors duration-200 group-hover:text-white">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#b51f17] group-hover:text-white/80">
            {player.roster_status === "former" ? "Former player" : "First team"}
            {player.position ? ` · ${player.position}` : ""}
          </p>
          <h2 className="mt-2 break-words text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl">{player.full_name}</h2>
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
  const personalDetails = [
    ["Squad number", player.shirt_number === null ? null : `#${player.shirt_number}`],
    ["Position", player.position],
    ["Nationality", player.nationality],
    ["Status", player.roster_status === "former" ? "Former player" : "First Team"]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <article>
      <section className="grid overflow-hidden bg-white text-neutral-950 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]" aria-label={`${player.full_name} profile`}>
        <div className="relative flex min-h-[420px] flex-col justify-end overflow-hidden bg-[#da291c] p-7 text-white sm:p-10 lg:min-h-[560px]">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/75">
            {player.roster_status === "former" ? "Former player" : "EFCC First Team"}
            {player.position ? ` · ${player.position}` : ""}
          </p>
          {player.shirt_number !== null ? (
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-0 text-[12rem] font-black leading-none text-white/10 sm:text-[17rem]">
              {player.shirt_number}
            </span>
          ) : null}
          <h1 className="relative mt-5 break-words text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl xl:text-8xl">
            {player.full_name}
          </h1>
          {player.shirt_number !== null ? (
            <p className="relative mt-6 text-sm font-bold uppercase tracking-[.2em]">Squad number {player.shirt_number}</p>
          ) : null}
        </div>
        <div className="relative min-h-[420px] bg-neutral-100 lg:min-h-[560px]">
          <PlayerPhoto player={player} imagePreviewUrl={imagePreviewUrl} />
        </div>
      </section>

      {personalDetails.length ? (
        <section className="mt-8 border border-neutral-200 bg-white p-6 sm:p-8" aria-labelledby="player-personal-heading">
          <h2 id="player-personal-heading" className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Player information</h2>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {personalDetails.map(([label, value]) => (
              <div key={label} className="border-t border-neutral-200 pt-3">
                <dt className="text-[10px] font-bold uppercase tracking-[.16em] text-neutral-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-bold text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {player.biography ? (
        <section className="mt-8 border border-neutral-200 bg-white p-6 sm:p-8">
          <h2 className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Biography</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-neutral-600">{player.biography}</p>
        </section>
      ) : null}
    </article>
  );
}
