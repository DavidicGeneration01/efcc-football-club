"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { savePlayerAction, type PlayerSaveState } from "@/app/admin/(dashboard)/team/actions";
import { SharedMediaUpload } from "@/components/admin/shared-media-upload";
import { PlayerProfileView } from "@/components/team/player-components";
import type { PlayerRecord } from "@/lib/team/queries";
import { isRosterStatus, type RosterStatus } from "@/lib/team/validation";

const initialState: PlayerSaveState = { status: "idle", message: "" };

const noticeMessages: Record<string, string> = {
  saved: "Player saved.",
  published: "Player profile published.",
  archived: "Player archived. The record and photo have been retained.",
  restored: "Player restored.",
  "archive-error": "The player could not be archived. Check access and try again.",
  "restore-error": "The player could not be restored. Check access and try again.",
  "not-found": "The player was not found or could not be updated."
};

export function PlayerForm({
  player,
  photoPreviewUrl,
  notice
}: {
  player: PlayerRecord | null;
  photoPreviewUrl?: string | null;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(savePlayerAction, initialState);
  const [fullName, setFullName] = useState(player?.full_name ?? "");
  const [slug, setSlug] = useState(player?.slug ?? "");
  const [shirtNumber, setShirtNumber] = useState(player?.shirt_number?.toString() ?? "");
  const [position, setPosition] = useState(player?.position ?? "");
  const [nationality, setNationality] = useState(player?.nationality ?? "");
  const [biography, setBiography] = useState(player?.biography ?? "");
  const [rosterStatus, setRosterStatus] = useState<RosterStatus>(player?.roster_status ?? "current");
  const [photoMediaId, setPhotoMediaId] = useState(player?.photo_media_id ?? "");
  const [savedPreviewUrl, setSavedPreviewUrl] = useState(photoPreviewUrl ?? null);

  const previewPlayer: PlayerRecord = {
    id: player?.id ?? "",
    full_name: fullName,
    slug,
    shirt_number: shirtNumber ? Number(shirtNumber) : null,
    position: position || null,
    nationality: nationality || null,
    biography: biography || null,
    photo_url: photoMediaId ? `/api/team-media/${photoMediaId}` : player?.photo_url ?? null,
    photo_media_id: photoMediaId || null,
    is_active: rosterStatus === "current",
    roster_status: rosterStatus,
    publication_status: player?.publication_status ?? "draft",
    published_at: player?.published_at ?? null,
    archived_at: player?.archived_at ?? null,
    archived_by: player?.archived_by ?? null,
    created_at: player?.created_at ?? "",
    updated_at: player?.updated_at ?? ""
  };

  return (
    <div>
      {notice && noticeMessages[notice] ? (
        <p className="mb-6 border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
          {noticeMessages[notice]}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{state.message}</p>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.9fr)]">
        <div className="space-y-6">
          <form action={formAction} className="space-y-6">
            {player ? <input type="hidden" name="id" value={player.id} /> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold">
              Full name
              <input
                name="full_name"
                required
                maxLength={120}
                value={fullName}
                onChange={event => setFullName(event.currentTarget.value)}
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Profile slug
              <input
                name="slug"
                maxLength={160}
                value={slug}
                onChange={event => setSlug(event.currentTarget.value)}
                placeholder="Generated from the player name if blank"
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Shirt number
              <input
                name="shirt_number"
                type="number"
                min={0}
                max={99}
                step={1}
                value={shirtNumber}
                onChange={event => setShirtNumber(event.currentTarget.value)}
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Position
              <input
                name="position"
                maxLength={80}
                value={position}
                onChange={event => setPosition(event.currentTarget.value)}
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Nationality
              <input
                name="nationality"
                maxLength={80}
                value={nationality}
                onChange={event => setNationality(event.currentTarget.value)}
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Classification
              <select
                name="roster_status"
                value={rosterStatus}
                onChange={event => {
                  if (isRosterStatus(event.currentTarget.value)) setRosterStatus(event.currentTarget.value);
                }}
                disabled={pending}
                className="mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none"
              >
                <option value="current">Current First Team</option>
                <option value="former">Former player</option>
                <option value="needs_review">Needs review</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-bold">
            Biography
            <textarea
              name="biography"
              rows={8}
              maxLength={10000}
              value={biography}
              onChange={event => setBiography(event.currentTarget.value)}
              disabled={pending}
              className="mt-2 block w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm font-normal leading-7 focus:border-[#da291c] focus:outline-none"
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              name="intent"
              value="save"
              disabled={pending}
              className="bg-[#111] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="border border-neutral-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[.12em] hover:border-[#da291c] disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending || rosterStatus === "needs_review"}
              className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] disabled:opacity-50"
            >
              Publish profile
            </button>
            <Link href="/admin/team" className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-[#b51f17]">
              Back to players
            </Link>
          </div>
          </form>

          <section className="border border-neutral-200 bg-neutral-50 p-5" aria-labelledby="player-photo-heading">
            <h2 id="player-photo-heading" className="text-sm font-bold uppercase tracking-wider">Player photograph</h2>
            {player && !player.archived_at ? (
              <div className="mt-4">
                <SharedMediaUpload
                  moduleName="team"
                  playerId={player.id}
                  onUploaded={({ mediaId, previewUrl }) => {
                    setPhotoMediaId(mediaId);
                    setSavedPreviewUrl(previewUrl);
                  }}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Save this player as a draft first. The photograph uploader becomes available after a player record exists.
              </p>
            )}
          </section>

          {player?.archived_at ? (
            <p className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This record is archived. Restore it from the player list before uploading a new photograph.
            </p>
          ) : null}
        </div>

        <aside className="self-start border border-neutral-200 bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Profile preview</p>
          <div className="mt-5">
            <PlayerProfileView player={previewPlayer} imagePreviewUrl={savedPreviewUrl} />
          </div>
          <p className="mt-5 text-xs leading-5 text-neutral-500">
            This preview uses the same profile presentation as the public player page. It does not publish the record.
          </p>
        </aside>
      </div>
    </div>
  );
}
