const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NewsArticleInput = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  categoryId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  intent: "draft" | "published";
};

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function parseNewsArticleInput(formData: FormData): ValidationResult<NewsArticleInput> {
  const idValue = readText(formData, "id");
  const title = readText(formData, "title");
  const suppliedSlug = readText(formData, "slug");
  const slug = suppliedSlug ? slugify(suppliedSlug) : slugify(title);
  const excerpt = readText(formData, "excerpt");
  const body = readText(formData, "body");
  const categoryId = readText(formData, "categoryId");
  const seoTitle = readText(formData, "seoTitle");
  const seoDescription = readText(formData, "seoDescription");

  if (idValue && !isUuid(idValue)) return { success: false, message: "The article identifier is invalid." };
  if (!title || title.length > 160) return { success: false, message: "Enter a title of 1 to 160 characters." };
  if (!slug || slug.length > 160 || !slugPattern.test(slug)) {
    return { success: false, message: "Enter a valid URL slug using letters, numbers, and hyphens." };
  }
  if (excerpt.length > 500) return { success: false, message: "The excerpt must be 500 characters or fewer." };
  if (!body || body.length > 50000) return { success: false, message: "Enter article text of 1 to 50,000 characters." };
  if (categoryId && !isUuid(categoryId)) return { success: false, message: "Choose a valid news category." };
  if (seoTitle.length > 160) return { success: false, message: "The SEO title must be 160 characters or fewer." };
  if (seoDescription.length > 320) {
    return { success: false, message: "The SEO description must be 320 characters or fewer." };
  }
  return {
    success: true,
    data: {
      id: idValue || null,
      title,
      slug,
      excerpt: excerpt || null,
      body,
      categoryId: categoryId || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      intent: "draft"
    }
  };
}

export function parseNewsCategoryInput(formData: FormData): ValidationResult<{
  id: string | null;
  name: string;
  slug: string;
}> {
  const idValue = readText(formData, "categoryId");
  const name = readText(formData, "name");
  const suppliedSlug = readText(formData, "slug");
  const slug = suppliedSlug ? slugify(suppliedSlug) : slugify(name);

  if (idValue && !isUuid(idValue)) return { success: false, message: "The category identifier is invalid." };
  if (!name || name.length > 80) return { success: false, message: "Enter a category name of 1 to 80 characters." };
  if (!slug || slug.length > 100 || !slugPattern.test(slug)) {
    return { success: false, message: "Enter a valid category slug using letters, numbers, and hyphens." };
  }

  return { success: true, data: { id: idValue || null, name, slug } };
}
