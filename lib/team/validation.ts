import { isUuid, slugify } from "@/lib/news/validation";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const rosterStatuses = ["current", "former", "needs_review"] as const;
const saveIntents = ["save", "draft", "publish"] as const;

export type RosterStatus = (typeof rosterStatuses)[number];
export type PlayerSaveIntent = (typeof saveIntents)[number];

export type PlayerInput = {
  id: string | null;
  fullName: string;
  slug: string;
  shirtNumber: number | null;
  position: string | null;
  nationality: string | null;
  biography: string | null;
  rosterStatus: RosterStatus;
  intent: PlayerSaveIntent;
};

export type PlayerValidationResult =
  | { success: true; data: PlayerInput }
  | { success: false; message: string };

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseInteger(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function parsePlayerInput(formData: FormData): PlayerValidationResult {
  const idValue = readText(formData, "id");
  const fullName = readText(formData, "full_name");
  const suppliedSlug = readText(formData, "slug");
  const slug = slugify(suppliedSlug || fullName);
  const shirtNumberValue = readText(formData, "shirt_number");
  const shirtNumber = parseInteger(shirtNumberValue);
  const position = readText(formData, "position");
  const nationality = readText(formData, "nationality");
  const biography = readText(formData, "biography");
  const rosterStatusValue = readText(formData, "roster_status");
  const intentValue = readText(formData, "intent");

  if (idValue && !isUuid(idValue)) return { success: false, message: "The player identifier is invalid." };
  if (!fullName || fullName.length > 200) {
    return { success: false, message: "Enter a player name of 1 to 200 characters." };
  }
  if (!slug || slug.length > 160 || !slugPattern.test(slug)) {
    return { success: false, message: "Enter a valid profile slug using letters, numbers, and hyphens." };
  }
  if (shirtNumberValue && (shirtNumber === null || shirtNumber === undefined || shirtNumber < 0 || shirtNumber > 99)) {
    return { success: false, message: "Shirt number must be a whole number from 0 to 99." };
  }
  if (position.length > 80) return { success: false, message: "Position must be 80 characters or fewer." };
  if (nationality.length > 80) return { success: false, message: "Nationality must be 80 characters or fewer." };
  if (biography.length > 10000) return { success: false, message: "Biography must be 10,000 characters or fewer." };
  if (!isRosterStatus(rosterStatusValue)) {
    return { success: false, message: "Choose a valid current/former classification." };
  }
  if (!isPlayerSaveIntent(intentValue)) {
    return { success: false, message: "Choose a valid save or publish action." };
  }

  return {
    success: true,
    data: {
      id: idValue || null,
      fullName,
      slug,
      shirtNumber: shirtNumber === undefined ? null : shirtNumber,
      position: position || null,
      nationality: nationality || null,
      biography: biography || null,
      rosterStatus: rosterStatusValue,
      intent: intentValue
    }
  };
}

export function isRosterStatus(value: string): value is RosterStatus {
  return (rosterStatuses as readonly string[]).includes(value);
}

export function isPlayerSaveIntent(value: string): value is PlayerSaveIntent {
  return (saveIntents as readonly string[]).includes(value);
}
