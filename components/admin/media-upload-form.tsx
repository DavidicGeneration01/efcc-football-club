"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { uploadMediaAction } from "@/app/admin/(dashboard)/media/actions";
import { initialMediaUploadState, MEDIA_CATEGORIES } from "@/lib/media";

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function MediaUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [state, formAction, pending] = useActionState(uploadMediaAction, initialMediaUploadState);
  const formRef = useRef<HTMLFormElement>(null);
  let submitLabel = status === "published" ? "Upload and publish" : "Upload draft";
  if (pending) {
    submitLabel = status === "published" ? "Uploading and publishing..." : "Uploading draft...";
  }

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setFile(null);
      setStatus("published");
    }
  }, [state]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setLocalError("");

    if (!selected) {
      setFile(null);
      return;
    }
    if (!allowedTypes.has(selected.type)) {
      setFile(null);
      event.currentTarget.value = "";
      setLocalError("Choose a JPEG, PNG, or WebP image. SVG and other formats are not accepted.");
      return;
    }
    if (selected.size > maxFileSize) {
      setFile(null);
      event.currentTarget.value = "";
      setLocalError("The image must be 10 MB or smaller.");
      return;
    }
    setFile(selected);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <div>
        <label htmlFor="media-file" className="block text-sm font-bold">Choose image</label>
        <input
          id="media-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseFile}
          required
          disabled={pending}
          className="mt-2 block w-full text-sm file:mr-4 file:border-0 file:bg-[#111] file:px-4 file:py-3 file:font-bold file:text-white"
        />
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          JPEG, PNG, or WebP; maximum 10 MB. Draft files remain private; published images are served through a public gallery route.
        </p>
      </div>

      {previewUrl && file ? (
        <div className="max-w-xl">
          <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
            <Image
              src={previewUrl}
              alt={`Preview of ${file.name}`}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 576px"
              className="object-contain"
            />
          </div>
          <p className="mt-2 break-all text-xs text-neutral-500">Selected: {file.name}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="media-category" className="block text-sm font-bold">Image category</label>
        <select
          id="media-category"
          name="category"
          required
          disabled={pending}
          defaultValue=""
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        >
          <option value="" disabled>Select a category</option>
          {MEDIA_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="media-title" className="block text-sm font-bold">Image title</label>
        <input
          id="media-title"
          name="title"
          type="text"
          required
          maxLength={160}
          disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="media-description" className="block text-sm font-bold">Description or caption</label>
        <textarea
          id="media-description"
          name="description"
          rows={4}
          maxLength={2000}
          disabled={pending}
          className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="media-status" className="block text-sm font-bold">Publishing status</label>
        <select
          id="media-status"
          name="status"
          value={status}
          onChange={event => {
            const value = event.currentTarget.value;
            if (value === "draft" || value === "published") setStatus(value);
          }}
          disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        >
          <option value="draft">Draft — hidden from the public gallery</option>
          <option value="published">Published — visible in the public gallery</option>
        </select>
      </div>

      {localError ? <p className="text-sm text-red-700" role="alert">{localError}</p> : null}
      {state.status === "error" ? <p className="text-sm text-red-700" role="alert">{state.message}</p> : null}
      {state.status === "success" ? (
        <div className="break-words text-sm text-green-800" role="status">
          <p>{state.message}</p>
          {state.publicUrl ? (
            <p className="mt-1">
              <a className="underline" href={state.publicUrl} target="_blank" rel="noreferrer">
                View uploaded image
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!file || pending}
        className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
