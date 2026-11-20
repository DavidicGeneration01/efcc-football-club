"use server";

import { randomUUID } from "node:crypto";
import { newsStaffRoles, requireStaffRole, type StaffRole } from "@/lib/auth/require-staff-role";
import { createClient } from "@/lib/supabase/server";
import { parseNewsContent, serializeNewsContent } from "@/lib/news/content";
import { isUuid } from "@/lib/news/validation";

export type SharedMediaUploadState = {
  status: "idle" | "success" | "error";
  message: string;
  mediaId?: string;
  assetUrl?: string;
  previewUrl?: string;
};

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const moduleRoles: Record<string, readonly StaffRole[]> = {
  news: newsStaffRoles,
  team: ["super_admin", "admin", "editor"],
  matches: ["super_admin", "admin", "editor"],
  club: ["super_admin", "admin", "editor"],
  honours: ["super_admin", "admin", "editor"],
  store: ["super_admin", "admin", "shop_manager"]
};

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return String.fromCharCode(...bytes.slice(0, 8)) === "\x89PNG\r\n\u001a\n";
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

type ModuleMediaScope = "library" | "player_photo";

async function cleanupModuleUpload({
  supabase,
  mediaId,
  storagePath,
  userId,
  scope
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  mediaId: string;
  storagePath: string;
  userId: string;
  scope: ModuleMediaScope;
}) {
  try {
    const { data: media, error: lookupError } = await supabase
      .from("media_items")
      .select("id,storage_path,uploaded_by,published,usage_scope")
      .eq("id", mediaId)
      .maybeSingle();

    if (lookupError) {
      console.error("Could not verify uploaded media before cleanup.", lookupError);
      return { success: false, message: `Media cleanup could not be verified: ${lookupError.message}` };
    }

    if (media) {
      if (
        media.storage_path !== storagePath ||
        media.uploaded_by !== userId ||
        media.usage_scope !== scope ||
        media.published
      ) {
        return { success: false, message: "The upload is no longer an owned, unpublished module asset; it was retained." };
      }

      const { data: deletedMedia, error: deleteError } = await supabase
        .from("media_items")
        .delete()
        .eq("id", mediaId)
        .eq("storage_path", storagePath)
        .eq("uploaded_by", userId)
        .eq("usage_scope", scope)
        .eq("published", false)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        console.error("Could not delete the unassociated module media record.", deleteError);
        return { success: false, message: `The media record could not be removed: ${deleteError.message}` };
      }
      if (!deletedMedia) {
        return { success: false, message: "The media record is still associated with content and was retained." };
      }
    }

    const { error: storageError } = await supabase.storage.from("efcc-media").remove([storagePath]);
    if (storageError) {
      console.error("Could not remove an unregistered module upload.", { storagePath, storageError });
      return { success: false, message: `The Storage object could not be removed: ${storageError.message}` };
    }

    return { success: true, message: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleanup error.";
    console.error("Module media cleanup did not complete.", { mediaId, storagePath, error });
    return { success: false, message };
  }
}

export async function uploadModuleMediaAction(
  _previousState: SharedMediaUploadState,
  formData: FormData
): Promise<SharedMediaUploadState> {
  const moduleName = formData.get("module");
  if (typeof moduleName !== "string" || !moduleRoles[moduleName]) {
    return { status: "error", message: "This upload module is not supported." };
  }
  const articleIdValue = formData.get("articleId");
  const articleId = typeof articleIdValue === "string" && articleIdValue ? articleIdValue : null;
  if (articleId && !isUuid(articleId)) {
    return { status: "error", message: "The article identifier is invalid." };
  }
  const playerIdValue = formData.get("playerId");
  const playerId = typeof playerIdValue === "string" && playerIdValue ? playerIdValue : null;
  if ((moduleName === "team" && (!playerId || !isUuid(playerId))) || (moduleName !== "team" && playerId)) {
    return { status: "error", message: "A valid player must be selected for this photograph." };
  }

  await requireStaffRole(moduleRoles[moduleName], "/admin");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image before uploading." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { status: "error", message: "The image must be 10 MB or smaller." };
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) return { status: "error", message: "Choose a JPEG, PNG, or WebP image." };
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasExpectedSignature(file.type, signature)) {
    return { status: "error", message: "The selected file does not match its image format." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { status: "error", message: "Your staff session could not be verified. Sign in again and retry." };
  }

  if (moduleName === "team" && playerId) {
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", playerId)
      .is("archived_at", null)
      .maybeSingle();
    if (playerError) {
      console.error("Could not verify the player before uploading a photograph.", playerError);
      return { status: "error", message: `The player could not be verified: ${playerError.message}` };
    }
    if (!player) return { status: "error", message: "The player was not found or is archived." };
  }

  const mediaId = randomUUID();
  const storagePath = `${moduleName}/${authData.user.id}/${randomUUID()}.${extension}`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from("efcc-media")
    .upload(storagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) return { status: "error", message: `Image upload failed: ${uploadError.message}` };

  const { error: insertError } = await supabase
    .from("media_items")
    .insert({
      id: mediaId,
      title: file.name,
      media_type: "image",
      category: moduleName === "news" ? "General Club Photography" : moduleName === "team" ? "First Team" : null,
      asset_url: `/api/media/${mediaId}`,
      storage_path: uploaded.path,
      uploaded_by: authData.user.id,
      published: false,
      usage_scope: moduleName === "team" ? "player_photo" : "library"
    });

  if (insertError) {
    console.error("Could not save module media metadata.", insertError);
    const cleanup = await cleanupModuleUpload({
      supabase,
      mediaId,
      storagePath: uploaded.path,
      userId: authData.user.id,
      scope: moduleName === "team" ? "player_photo" : "library"
    });
    return {
      status: "error",
      message: `Image metadata could not be saved: ${insertError.message}${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
    };
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("efcc-media")
    .createSignedUrl(uploaded.path, 300);
  if (signedError || !signed?.signedUrl) {
    const cleanup = await cleanupModuleUpload({
      supabase,
      mediaId,
      storagePath: uploaded.path,
      userId: authData.user.id,
      scope: moduleName === "team" ? "player_photo" : "library"
    });
    console.error("Could not create an admin preview for uploaded media.", signedError);
    return {
      status: "error",
      message: `${signedError ? `The image uploaded but its preview could not be created: ${signedError.message}` : "The image uploaded but its preview could not be created."}${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
    };
  }

  if (moduleName === "team" && playerId) {
    const playerPhotoUrl = `/api/team-media/${mediaId}`;
    const { data: associatedPlayer, error: associationError } = await supabase
      .from("players")
      .update({
        photo_media_id: mediaId,
        photo_url: playerPhotoUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", playerId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (associationError || !associatedPlayer) {
      const { data: verifiedPlayer, error: verifyError } = await supabase
        .from("players")
        .select("photo_media_id")
        .eq("id", playerId)
        .maybeSingle();
      if (!verifyError && verifiedPlayer?.photo_media_id === mediaId) {
        return {
          status: "success",
          message: "Player photograph was associated despite an interrupted response.",
          mediaId,
          assetUrl: playerPhotoUrl,
          previewUrl: signed.signedUrl
        };
      }

      const cleanup = await cleanupModuleUpload({
        supabase,
        mediaId,
        storagePath: uploaded.path,
        userId: authData.user.id,
        scope: "player_photo"
      });
      if (verifyError) {
        console.error("Could not verify the player photograph association.", verifyError);
        return {
          status: "error",
          message: `The photograph association could not be verified. The uploaded media was retained.${cleanup.success ? "" : ` Cleanup: ${cleanup.message}`}`
        };
      }
      console.error("Could not associate the uploaded photograph with its player.", associationError);
      return {
        status: "error",
        message: `The photograph could not be associated with the player.${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
      };
    }

    return {
      status: "success",
      message: "Player photograph uploaded and associated.",
      mediaId,
      assetUrl: playerPhotoUrl,
      previewUrl: signed.signedUrl
    };
  }

  if (moduleName === "news" && articleId) {
    const { data: article, error: articleError } = await supabase
      .from("news")
      .select("body")
      .eq("id", articleId)
      .maybeSingle();
    if (articleError || !article) {
      const cleanup = await cleanupModuleUpload({
        supabase,
        mediaId,
        storagePath: uploaded.path,
        userId: authData.user.id,
        scope: "library"
      });
      return {
        status: "error",
        message: articleError
          ? `The image uploaded but the article could not be associated: ${articleError.message}${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
          : `The image uploaded but the article could not be found for association.${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
      };
    }

    const { error: attachmentError } = await supabase
      .from("news_media_attachments")
      .upsert(
        { news_id: articleId, media_id: mediaId },
        { onConflict: "news_id,media_id", ignoreDuplicates: true }
      );
    if (attachmentError) {
      console.error("Could not authorize the uploaded News image.", attachmentError);
      const cleanup = await cleanupModuleUpload({
        supabase,
        mediaId,
        storagePath: uploaded.path,
        userId: authData.user.id,
        scope: "library"
      });
      return {
        status: "error",
        message: `The image could not be authorized for News: ${attachmentError.message}${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
      };
    }

    const blocks = parseNewsContent(article.body);
    const updatedBody = serializeNewsContent([
      ...blocks,
      {
        type: "image",
        mediaId,
        assetUrl: `/api/news-media/${mediaId}`,
        caption: "",
        alt: file.name
      }
    ]);
    const { data: associatedArticle, error: associationError } = await supabase
      .from("news")
      .update({ body: updatedBody, updated_at: new Date().toISOString() })
      .eq("id", articleId)
      .eq("body", article.body)
      .select("id")
      .maybeSingle();
    if (associationError || !associatedArticle) {
      console.error(
        "Could not associate uploaded image with the news article.",
        associationError ?? "The article changed before the image was associated."
      );
      const { data: verifiedArticle, error: verifyError } = await supabase
        .from("news")
        .select("body")
        .eq("id", articleId)
        .maybeSingle();
      if (!verifyError && verifiedArticle && parseNewsContent(verifiedArticle.body).some(
        block => block.type === "image" && block.mediaId === mediaId
      )) {
        return {
          status: "success",
          message: "The image was associated despite an interrupted response.",
          mediaId,
          assetUrl: `/api/admin/news-media/${mediaId}`,
          previewUrl: signed.signedUrl
        };
      }
      if (verifyError) {
        console.error("Could not verify the image association with the news article.", verifyError);
        return {
          status: "error",
          message: `The image association could not be verified. The upload was retained; check the article before retrying.`
        };
      }
      const cleanup = await cleanupModuleUpload({
        supabase,
        mediaId,
        storagePath: uploaded.path,
        userId: authData.user.id,
        scope: "library"
      });
      const failureMessage = associationError?.message ?? "The article changed before the image could be associated.";
      return {
        status: "error",
        message: `The image could not be associated with the article: ${failureMessage}${cleanup.success ? "" : ` Cleanup also failed: ${cleanup.message}`}`
      };
    }
  }

  return {
    status: "success",
    message: "Image uploaded. It was not added to the public Media Library.",
    mediaId,
    assetUrl: `/api/admin/news-media/${mediaId}`,
    previewUrl: signed.signedUrl
  };
}
