"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  uploadModuleMediaAction,
  type SharedMediaUploadState
} from "@/app/admin/media-upload-actions";

const initialState: SharedMediaUploadState = { status: "idle", message: "" };

export function SharedMediaUpload({
  moduleName,
  articleId,
  playerId,
  onUploaded
}: {
  moduleName: "news" | "team" | "matches" | "club" | "honours" | "store";
  articleId?: string;
  playerId?: string;
  onUploaded?: (media: {
    mediaId: string;
    assetUrl: string;
    previewUrl: string;
    fileName: string;
  }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const [state, formAction, pending] = useActionState(uploadModuleMediaAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [handledMediaId, setHandledMediaId] = useState("");
  const [associatedMediaId, setAssociatedMediaId] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (state.status === "success" && state.mediaId && state.assetUrl && state.previewUrl && file && handledMediaId !== state.mediaId) {
      setHandledMediaId(state.mediaId);
      onUploaded?.({
        mediaId: state.mediaId,
        assetUrl: state.assetUrl,
        previewUrl: state.previewUrl,
        fileName: file.name
      });
      setAssociatedMediaId(state.mediaId);
      formRef.current?.reset();
      setFile(null);
    }
  }, [file, handledMediaId, onUploaded, state]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setLocalError("");
    const selected = event.currentTarget.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setFile(null);
      event.currentTarget.value = "";
      setLocalError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null);
      event.currentTarget.value = "";
      setLocalError("The image must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
  }

  return (
    <div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="module" value={moduleName} />
        {articleId ? <input type="hidden" name="articleId" value={articleId} /> : null}
        {playerId ? <input type="hidden" name="playerId" value={playerId} /> : null}
        <label htmlFor={`upload-${moduleName}`} className="block text-sm font-bold">Upload image</label>
        <input
          id={`upload-${moduleName}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseFile}
          disabled={pending}
          required
          className="mt-2 block w-full text-sm file:mr-4 file:border-0 file:bg-[#111] file:px-4 file:py-3 file:font-bold file:text-white"
        />
        {previewUrl && file ? (
          <div className="max-w-md">
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
              <Image src={previewUrl} alt="" fill unoptimized sizes="448px" className="object-contain" />
            </div>
            <p className="mt-2 break-all text-xs text-neutral-500">{file.name}</p>
          </div>
        ) : null}
        {localError ? <p className="text-sm text-red-700" role="alert">{localError}</p> : null}
        {state.status === "error" ? <p className="text-sm text-red-700" role="alert">{state.message}</p> : null}
        {state.status === "success" && associatedMediaId === state.mediaId ? (
          <p className="text-sm text-green-800" role="status">{state.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={!file || pending}
          className="bg-[#111] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload image"}
        </button>
      </form>
    </div>
  );
}
