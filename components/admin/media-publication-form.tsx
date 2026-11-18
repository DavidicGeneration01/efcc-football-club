"use client";

import { useFormStatus } from "react-dom";
import { changeMediaPublicationAction } from "@/app/admin/(dashboard)/media/actions";

function PublicationButton({
  willPublish,
  disabled
}: {
  willPublish: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`w-full px-4 py-2.5 text-xs font-bold uppercase tracking-[.12em] text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        willPublish ? "bg-[#da291c] hover:bg-[#b51f17]" : "bg-[#111] hover:bg-neutral-700"
      }`}
    >
      {pending ? "Updating..." : willPublish ? "Publish" : "Unpublish"}
    </button>
  );
}

export function MediaPublicationForm({
  mediaId,
  published,
  disabled = false
}: {
  mediaId: string;
  published: boolean;
  disabled?: boolean;
}) {
  return (
    <form action={changeMediaPublicationAction}>
      <input type="hidden" name="mediaId" value={mediaId} />
      <input type="hidden" name="published" value={published ? "false" : "true"} />
      <PublicationButton willPublish={!published} disabled={disabled} />
    </form>
  );
}
