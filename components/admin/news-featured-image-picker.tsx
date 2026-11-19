"use client";

import Image from "next/image";
import { useState } from "react";
import type { NewsImageOption } from "@/lib/news/queries";

export function NewsFeaturedImagePicker({
  images,
  initialValue,
  keepUnavailableImage = false
}: {
  images: NewsImageOption[];
  initialValue: string;
  keepUnavailableImage?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(initialValue);
  const selectedImage = images.find(image => image.id === selectedId);

  return (
    <div>
      <label htmlFor="news-featured-image" className="block text-sm font-bold">Featured image</label>
      <select
        id="news-featured-image"
        name="featuredImageId"
        value={selectedId}
        onChange={event => setSelectedId(event.currentTarget.value)}
        className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
      >
        <option value="">No featured image</option>
        {keepUnavailableImage ? <option value="keep">Keep current image (not in published media)</option> : null}
        {images.map(image => (
          <option key={image.id} value={image.id}>{image.title}</option>
        ))}
      </select>
      <p className="mt-2 text-xs leading-5 text-neutral-500">
        Only images already published in the Media Library are available here. Upload and publish images in Media Library first.
      </p>
      {selectedImage ? (
        <div className="mt-4 max-w-md">
          <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
            <Image
              src={selectedImage.asset_url}
              alt={selectedImage.title}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-600">Selected: {selectedImage.title}</p>
        </div>
      ) : selectedId === "keep" ? (
        <p className="mt-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          The current image is no longer in the published media list. It will be preserved unless you choose another image or remove it.
        </p>
      ) : null}
    </div>
  );
}
