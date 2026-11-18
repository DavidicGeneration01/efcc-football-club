import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { MediaPublicationForm } from "@/components/admin/media-publication-form";
import { mediaStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";

const notices: Record<string, { tone: "success" | "error"; message: string }> = {
  published: { tone: "success", message: "Image published and visible in the public gallery." },
  unpublished: { tone: "success", message: "Image unpublished and removed from the public gallery." },
  unchanged: { tone: "success", message: "The image already has that publishing status." },
  invalid: { tone: "error", message: "The media status request was invalid. Please try again." },
  "auth-error": { tone: "error", message: "Your session could not be verified. Sign in again and retry." },
  "not-found": { tone: "error", message: "The image was not found or could not be updated." },
  "not-owner": {
    tone: "error",
    message: "The current media policy allows only the uploading staff member to change this image's status."
  },
  "update-error": { tone: "error", message: "The image status could not be changed. Check your access and try again." }
};

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short"
});

export default async function AdminMediaPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireStaffRole(mediaStaffRoles, "/admin");

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("The authenticated media staff session could not be loaded.");

  const { data, error } = await supabase
    .from("media_items")
    .select("id,title,category,media_type,asset_url,storage_path,published,created_at,uploaded_by")
    .eq("media_type", "image")
    .order("created_at", { ascending: false });

  let items: Array<{
    id: string;
    title: string;
    category: string | null;
    media_type: string;
    asset_url: string | null;
    storage_path: string | null;
    published: boolean;
    created_at: string;
    uploaded_by: string | null;
    previewUrl: string | null;
  }> = [];

  if (error) {
    console.error("Could not load the uploaded media list.", error);
  } else {
    items = await Promise.all(
      data.map(async item => {
        if (!item.storage_path) {
          return {
            ...item,
            previewUrl: item.published ? item.asset_url : null
          };
        }

        try {
          const { data: signedImage, error: signedUrlError } = await supabase.storage
            .from("efcc-media")
            .createSignedUrl(item.storage_path, 120);

          if (signedUrlError) {
            console.error(`Could not create an admin preview for media ${item.id}.`, signedUrlError);
          }

          return {
            ...item,
            previewUrl: signedUrlError ? null : signedImage.signedUrl
          };
        } catch (previewError) {
          console.error(`Could not create an admin preview for media ${item.id}.`, previewError);
          return { ...item, previewUrl: null };
        }
      })
    );
  }

  const { notice: noticeCode } = await searchParams;
  const notice = noticeCode ? notices[noticeCode] : undefined;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Media library</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Upload images</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        Add club images to the public gallery or save them as drafts. Published images appear automatically in their selected category. Videos should be hosted by an approved streaming provider.
      </p>
      <div className="mt-7 border border-neutral-200 bg-white p-5 sm:p-8">
        <MediaUploadForm />
      </div>

      <section className="mt-12" aria-labelledby="uploaded-media-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Content management</p>
            <h2 id="uploaded-media-heading" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Uploaded Media Management
            </h2>
          </div>
          {!error ? <p className="text-sm text-neutral-500">{items.length} {items.length === 1 ? "image" : "images"}</p> : null}
        </div>

        {notice ? (
          <p
            className={`mt-5 border p-4 text-sm ${
              notice.tone === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role={notice.tone === "success" ? "status" : "alert"}
          >
            {notice.message}
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            Uploaded media could not be loaded. Please try again later.
          </p>
        ) : items.length === 0 ? (
          <div className="mt-5 border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600 sm:p-10">
            No uploaded images yet. Images saved with the upload form will appear here.
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(item => {
              const canChangeStatus = item.uploaded_by === authData.user.id;

              return (
                <article key={item.id} className="overflow-hidden border border-neutral-200 bg-white">
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {item.previewUrl ? (
                      <Image
                        src={item.previewUrl}
                        alt={item.title}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-5 text-center text-sm text-neutral-500">
                        Image preview unavailable
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold">{item.title}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{item.category || "Uncategorized"}</p>
                      </div>
                      <span
                        className={`shrink-0 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          item.published
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {item.published ? "Published" : "Draft"}
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-xs">
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-neutral-500">Media type</dt>
                        <dd className="mt-1 capitalize text-neutral-800">{item.media_type}</dd>
                      </div>
                      <div>
                        <dt className="font-bold uppercase tracking-wider text-neutral-500">Uploaded</dt>
                        <dd className="mt-1 text-neutral-800">
                          <time dateTime={item.created_at}>{dateFormatter.format(new Date(item.created_at))}</time>
                        </dd>
                      </div>
                    </dl>

                    <MediaPublicationForm
                      mediaId={item.id}
                      published={item.published}
                      disabled={!canChangeStatus}
                    />
                    {!canChangeStatus ? (
                      <p className="text-xs leading-5 text-neutral-500">
                        Status changes are limited to the uploading staff account by the current database policy.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
