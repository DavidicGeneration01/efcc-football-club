"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mediaStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { isMediaCategory, type MediaUploadState } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

const bucket = "efcc-media";
const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function removeUploadedObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return error?.message ?? null;
  } catch (error) {
    return error instanceof Error ? error.message : "Unknown storage cleanup error.";
  }
}

async function findSavedMediaRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
) {
  try {
    const { data, error } = await supabase
      .from("media_items")
      .select("id")
      .eq("storage_path", path)
      .maybeSingle();
    return { found: Boolean(data), error: error?.message ?? null };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : "Unknown database lookup error."
    };
  }
}

export async function uploadMediaAction(
  _previousState: MediaUploadState,
  formData: FormData
): Promise<MediaUploadState> {
  await requireStaffRole(mediaStaffRoles, "/admin");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the media uploader.", authError);
    return { status: "error", message: "Your session could not be verified. Sign in again and retry." };
  }

  const titleValue = formData.get("title");
  const descriptionValue = formData.get("description");
  const categoryValue = formData.get("category");
  const statusValue = formData.get("status");
  const fileValue = formData.get("file");

  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const category = typeof categoryValue === "string" ? categoryValue : "";
  const status = typeof statusValue === "string" ? statusValue : "";

  if (!title || title.length > 160) {
    return { status: "error", message: "Enter an image title of 1 to 160 characters." };
  }
  if (description.length > 2000) {
    return { status: "error", message: "The caption must be 2,000 characters or fewer." };
  }
  if (!isMediaCategory(category)) {
    return { status: "error", message: "Choose a valid image category." };
  }
  if (status !== "draft" && status !== "published") {
    return { status: "error", message: "Choose Draft or Published." };
  }
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { status: "error", message: "Choose an image before uploading." };
  }
  if (fileValue.size > maxFileSize) {
    return { status: "error", message: "The image must be 10 MB or smaller." };
  }

  const extension = allowedTypes.get(fileValue.type);
  if (!extension) {
    return { status: "error", message: "Choose a JPEG, PNG, or WebP image." };
  }

  const signature = new Uint8Array(await fileValue.slice(0, 12).arrayBuffer());
  if (!hasExpectedSignature(fileValue.type, signature)) {
    return { status: "error", message: "The selected file does not match its image format." };
  }

  const storagePath = `${new Date().toISOString().slice(0, 10)}/${authData.user.id}/${randomUUID()}.${extension}`;
  const mediaId = randomUUID();
  const publicUrl = `/api/media/${mediaId}`;
  let uploadAttempted = false;
  let metadataSaved = false;

  try {
    uploadAttempted = true;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileValue, {
        cacheControl: "3600",
        contentType: fileValue.type,
        upsert: false
      });

    if (uploadError) {
        const cleanupError = await removeUploadedObject(supabase, storagePath);
        if (cleanupError) {
          console.error("Storage upload failed and cleanup could not be confirmed.", {
            path: storagePath,
            cleanupError,
            uploadError
          });
          return {
            status: "error",
            message: `Image upload failed (${uploadError.message}), and cleanup could not be confirmed. The file may remain at ${storagePath}.`
          };
        }
      return { status: "error", message: `Image upload failed: ${uploadError.message}` };
    }

    const { error: insertError } = await supabase.from("media_items").insert({
      id: mediaId,
      title,
      description: description || null,
      media_type: "image",
      category,
      asset_url: publicUrl,
      storage_path: uploaded.path,
      uploaded_by: authData.user.id,
      published: status === "published"
    });

    if (insertError) {
      const cleanupError = await removeUploadedObject(supabase, uploaded.path);
      console.error("Could not save uploaded media metadata.", insertError);
      if (cleanupError) {
        console.error("Could not remove the unregistered media object.", {
          path: uploaded.path,
          error: cleanupError
        });
        return {
          status: "error",
          message: `Metadata save failed (${insertError.message}), and file cleanup failed. The file may remain at ${uploaded.path}.`
        };
      }
      return {
        status: "error",
        message: `Metadata save failed: ${insertError.message}. The uploaded file was removed.`
      };
    }
    metadataSaved = true;

    try {
      revalidatePath("/gallery");
    } catch (error) {
      console.error("Media was saved, but gallery revalidation failed.", error);
      return {
        status: "success",
        title,
        ...(status === "published" ? { publicUrl } : {}),
        message: "Image saved. The gallery will refresh on its next request."
      };
    }

    return {
      status: "success",
      title,
      ...(status === "published" ? { publicUrl } : {}),
      message: status === "published" ? "Image published to the gallery." : "Image saved as a draft."
    };
  } catch (error) {
    if (metadataSaved) {
      console.error("Media was saved, but the action did not finish normally.", error);
      return {
        status: "success",
        title,
        ...(status === "published" ? { publicUrl } : {}),
        message: "Image saved. The gallery will refresh on its next request."
      };
    }

    if (uploadAttempted) {
      const lookup = await findSavedMediaRecord(supabase, storagePath);
      if (lookup.found) {
        console.error("Media metadata was saved despite an interrupted upload response.", error);
        return {
          status: "success",
          title,
          message: "Image saved. The gallery will refresh on its next request."
        };
      }
      if (lookup.error) {
        console.error("Could not verify whether media metadata was saved.", {
          path: storagePath,
          lookupError: lookup.error,
          error
        });
        return {
          status: "error",
          message: `Could not verify the database save. The file may remain at ${storagePath}; ask an administrator to check this path before retrying.`
        };
      }

      const cleanupError = await removeUploadedObject(supabase, storagePath);
      if (cleanupError) {
        console.error("Media upload failed and cleanup also failed.", {
          path: storagePath,
          cleanupError,
          error
        });
        return {
          status: "error",
          message: `Upload failed, and cleanup could not be confirmed. The file may remain at ${storagePath}.`
        };
      }
    }

    const detail = error instanceof Error ? error.message : "Unknown error.";
    console.error("Media upload failed.", error);
    return { status: "error", message: `The media upload could not be completed: ${detail}` };
  }
}

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function changeMediaPublicationAction(formData: FormData) {
  await requireStaffRole(mediaStaffRoles, "/admin");

  const mediaId = formData.get("mediaId");
  const publishedValue = formData.get("published");
  if (
    typeof mediaId !== "string" ||
    !mediaIdPattern.test(mediaId) ||
    (publishedValue !== "true" && publishedValue !== "false")
  ) {
    redirect("/admin/media?notice=invalid");
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the media status updater.", authError);
    redirect("/admin/media?notice=auth-error");
  }

  const { data: media, error: readError } = await supabase
    .from("media_items")
    .select("id,published,uploaded_by")
    .eq("id", mediaId)
    .eq("media_type", "image")
    .maybeSingle();

  if (readError) {
    console.error("Could not load media before changing publication status.", readError);
    redirect("/admin/media?notice=update-error");
  }
  if (!media) redirect("/admin/media?notice=not-found");
  if (media.uploaded_by !== authData.user.id) {
    redirect("/admin/media?notice=not-owner");
  }

  const published = publishedValue === "true";
  if (media.published === published) redirect("/admin/media?notice=unchanged");

  const { data: updatedMedia, error: updateError } = await supabase
    .from("media_items")
    .update({ published })
    .eq("id", mediaId)
    .eq("media_type", "image")
    .eq("uploaded_by", authData.user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Could not update media publication status.", updateError);
    redirect("/admin/media?notice=update-error");
  }
  if (!updatedMedia) redirect("/admin/media?notice=not-found");

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
  redirect(`/admin/media?notice=${published ? "published" : "unpublished"}`);
}
