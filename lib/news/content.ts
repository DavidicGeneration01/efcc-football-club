export type NewsTextBlock = {
  type: "text";
  text: string;
};

export type NewsImageBlock = {
  type: "image";
  mediaId: string;
  assetUrl: string;
  caption: string;
  alt: string;
  previewUrl?: string;
};

export type NewsContentBlock = NewsTextBlock | NewsImageBlock;

const contentPrefix = "__EFCC_NEWS_CONTENT__";

export function serializeNewsContent(blocks: NewsContentBlock[]) {
  const stableBlocks = blocks.map(block => block.type === "image"
    ? { type: "image", mediaId: block.mediaId, assetUrl: block.assetUrl, caption: block.caption, alt: block.alt }
    : block);
  return `${contentPrefix}${JSON.stringify({ blocks: stableBlocks })}`;
}

export function parseNewsContent(body: string): NewsContentBlock[] {
  if (body.startsWith(contentPrefix)) {
    try {
      const parsed = JSON.parse(body.slice(contentPrefix.length)) as { blocks?: NewsContentBlock[] };
      if (Array.isArray(parsed.blocks)) {
        return parsed.blocks.filter(block => {
          if (block.type === "text") return typeof block.text === "string";
          return block.type === "image"
            && typeof block.mediaId === "string"
            && typeof block.assetUrl === "string";
        });
      }
    } catch {
      // Fall back to plain text for data written before block content existed.
    }
  }

  return body ? [{ type: "text", text: body }] : [];
}

export function getNewsFeaturedImage(body: string, preferredMediaId?: string | null) {
  const imageBlocks = parseNewsContent(body).filter((block): block is NewsImageBlock => block.type === "image");
  const featuredBlock = imageBlocks.find(block => block.mediaId === preferredMediaId) ?? imageBlocks[0];
  return featuredBlock ? `/api/news-media/${featuredBlock.mediaId}` : null;
}
