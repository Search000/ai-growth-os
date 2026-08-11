import { logger } from "../logger.js";

export async function discoverSitemapUrls(baseUrl: string): Promise<string[]> {
  try {
    const url = new URL(baseUrl);
    const sitemapUrl = `${url.protocol}//${url.host}/sitemap.xml`;

    const response = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
    const urls = matches.map((m) => m[1].trim()).filter(Boolean);

    logger.info({ sitemapUrl, count: urls.length }, "Sitemap discovered");
    return urls;
  } catch (err) {
    logger.warn({ err, baseUrl }, "Sitemap discovery failed");
    return [];
  }
}
