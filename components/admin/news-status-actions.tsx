"use client";

import { useFormStatus } from "react-dom";
import { publishNewsArticleByIdAction, unpublishNewsArticleAction } from "@/app/admin/(dashboard)/news/actions";

function StatusButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-3 py-2 text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-50 ${
        published ? "text-neutral-600 hover:bg-neutral-100" : "text-[#b51f17] hover:bg-red-50"
      }`}
    >
      {pending ? (published ? "Unpublishing..." : "Publishing...") : (published ? "Unpublish" : "Publish")}
    </button>
  );
}

export function NewsStatusAction({ id, published }: { id: string; published: boolean }) {
  return (
    <form action={published ? unpublishNewsArticleAction : publishNewsArticleByIdAction}>
      <input type="hidden" name="id" value={id} />
      <StatusButton published={published} />
    </form>
  );
}
