import * as cheerio from "cheerio";

export interface PageMetadata {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsDirective: string | null;
  h1: string[];
  h2: string[];
  internalLinks: string[];
  externalLinks: string[];
  images: { src: string; alt: string | null }[];
  wordCount: number;
}

export function extractMetadata(html: string, pageUrl: string): PageMetadata {
  const $ = cheerio.load(html);
  const pageHost = new URL(pageUrl).host;

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, pageUrl).toString();
      const linkHost = new URL(resolved).host;
      if (linkHost === pageHost) {
        internalLinks.push(resolved);
      } else {
        externalLinks.push(resolved);
      }
    } catch {
      // ignore invalid hrefs (mailto:, javascript:, etc.)
    }
  });

  const images = $("img")
    .map((_, el) => ({
      src: $(el).attr("src") ?? "",
      alt: $(el).attr("alt") ?? null,
    }))
    .get();

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  return {
    title: $("title").first().text().trim() || null,
    metaDescription: $('meta[name="description"]').attr("content") ?? null,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    robotsDirective: $('meta[name="robots"]').attr("content") ?? null,
    h1: $("h1").map((_, el) => $(el).text().trim()).get(),
    h2: $("h2").map((_, el) => $(el).text().trim()).get(),
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    images,
    wordCount: bodyText.split(" ").filter(Boolean).length,
  };
}
