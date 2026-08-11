import { normalizeUrl } from "./url-utils.js";
import { isAllowedByRobots } from "./robots.js";
import { fetchPage } from "./fetcher.js";
import { extractMetadata, type PageMetadata } from "./metadata.js";
import { discoverSitemapUrls } from "./sitemap.js";
import { logger } from "../logger.js";

export interface CrawledPageResult {
  url: string;
  statusCode: number;
  durationMs: number;
  metadata: PageMetadata;
}

export interface SiteCrawlResult {
  startUrl: string;
  pagesCrawled: number;
  pages: CrawledPageResult[];
  errors: { url: string; error: string }[];
}

export interface SiteCrawlOptions {
  maxPages?: number;
  sameHostOnly?: boolean;
}

export async function crawlSite(startUrl: string, options: SiteCrawlOptions = {}): Promise<SiteCrawlResult> {
  const maxPages = options.maxPages ?? 10;
  const sameHostOnly = options.sameHostOnly ?? true;

  const startHost = new URL(startUrl).host;
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(startUrl)];
  const pages: CrawledPageResult[] = [];
  const errors: { url: string; error: string }[] = [];

  const sitemapUrls = await discoverSitemapUrls(startUrl);
  for (const su of sitemapUrls) {
    if (queue.length + visited.size < maxPages * 2) {
      try {
        const normalized = normalizeUrl(su);
        if (!sameHostOnly || new URL(normalized).host === startHost) {
          queue.push(normalized);
        }
      } catch {
        // skip invalid sitemap URLs
      }
    }
  }

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const allowed = await isAllowedByRobots(current);
      if (!allowed) {
        errors.push({ url: current, error: "Blocked by robots.txt" });
        continue;
      }

      const page = await fetchPage(current);
      const metadata = extractMetadata(page.html, current);

      pages.push({
        url: current,
        statusCode: page.statusCode,
        durationMs: page.durationMs,
        metadata,
      });

      for (const link of metadata.internalLinks) {
        if (visited.size + queue.length >= maxPages) break;
        try {
          const normalizedLink = normalizeUrl(link);
          if (!visited.has(normalizedLink) && !queue.includes(normalizedLink)) {
            if (!sameHostOnly || new URL(normalizedLink).host === startHost) {
              queue.push(normalizedLink);
            }
          }
        } catch {
          // skip invalid links
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ url: current, error: message });
      logger.warn({ url: current, err }, "Failed to crawl page");
    }
  }

  logger.info({ startUrl, pagesCrawled: pages.length, errors: errors.length }, "Site crawl complete");

  return {
    startUrl: normalizeUrl(startUrl),
    pagesCrawled: pages.length,
    pages,
    errors,
  };
}
