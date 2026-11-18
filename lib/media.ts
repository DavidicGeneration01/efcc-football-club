export const MEDIA_CATEGORIES = [
  "First Team",
  "Academy",
  "Matchday",
  "Training",
  "Trophies",
  "Club Events",
  "Supporters",
  "Facilities",
  "General Club Photography"
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export function isMediaCategory(value: string): value is MediaCategory {
  return MEDIA_CATEGORIES.some(category => category === value);
}

export type MediaUploadState = {
  status: "idle" | "success" | "error";
  message: string;
  publicUrl?: string;
  title?: string;
};

export const initialMediaUploadState: MediaUploadState = {
  status: "idle",
  message: ""
};
