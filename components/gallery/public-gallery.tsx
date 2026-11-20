import Image from "next/image";
import { MEDIA_CATEGORIES } from "@/lib/media";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function PublicGallery() {
  if (!hasSupabaseEnv()) {
    return (
      <p className="section-content border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="status">
        The photo gallery is unavailable because Supabase is not configured.
      </p>
    );
  }

  const supabase = await createClient();
  const mediaQuery = supabase
    .from("media_items")
    .select("id,title,description,category,asset_url,created_at")
    .eq("media_type", "image")
    .eq("usage_scope", "library")
    .eq("published", true)
    .not("asset_url", "is", null)
    .neq("asset_url", "")
    .order("created_at", { ascending: false });
  let result: Awaited<typeof mediaQuery>;
  try {
    result = await mediaQuery;
  } catch (error) {
    console.error("Could not load the public media gallery.", error);
    return (
      <p className="section-content border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">
        The photo gallery could not be loaded. Please try again later.
      </p>
    );
  }

  if (result.error) {
    console.error("Could not load the public media gallery.", result.error);
    return (
      <p className="section-content border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">
        The photo gallery could not be loaded. Please try again later.
      </p>
    );
  }

  type GalleryItem = (typeof result.data)[number] & { asset_url: string };
  const items = result.data.filter((item): item is GalleryItem => Boolean(item.asset_url));

  if (!items.length) {
    return (
      <div className="section-content border border-dashed border-neutral-300 bg-neutral-50 p-8 md:p-14">
        <p className="text-xs font-bold tracking-[.18em] text-[#da291c]">PHOTO GALLERY</p>
        <h2 className="mt-4 uppercase">No published images yet</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
          Club photography will appear here after it has been published by an authorized EFCC staff member.
        </p>
      </div>
    );
  }

  const categories = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const category = item.category || "General Club Photography";
    const categoryItems = categories.get(category) ?? [];
    categoryItems.push(item);
    categories.set(category, categoryItems);
  }

  const orderedCategories = [
    ...MEDIA_CATEGORIES.filter(category => categories.has(category)),
    ...Array.from(categories.keys()).filter(category => !MEDIA_CATEGORIES.some(known => known === category))
  ];

  return (
    <div className="section-content space-y-12">
      {orderedCategories.map(category => (
        <section key={category} aria-labelledby={`gallery-${category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
          <h2
            id={`gallery-${category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
            className="mb-5 text-2xl font-extrabold uppercase tracking-tight"
          >
            {category}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.get(category)?.map(item => (
              <article key={item.id} className="overflow-hidden border border-neutral-200 bg-white">
                <div className="relative aspect-[4/3] bg-neutral-100">
                  <Image
                    src={item.asset_url}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#b51f17]">{category}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">{item.description}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
