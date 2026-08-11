import type { Tool } from "./tool.js";
import { isValidUrl, normalizeUrl } from "../crawler/url-utils.js";
import { isAllowedByRobots } from "../crawler/robots.js";
import { fetchPage } from "../crawler/fetcher.js";
import { extractMetadata } from "../crawler/metadata.js";
import { runSeoChecks, scoreChecks } from "../seo/rules.js";

export const crawlAndAnalyzeTool: Tool = {
  name: "crawl_and_analyze_seo",
  description: "Crawls a single web page and runs deterministic SEO checks. Returns metadata, score, and check results.",
  params: {
    url: { type: "string", description: "The URL to crawl and analyze", required: true },
  },
  permission: "network",
  async execute(args) {
    const url = args.url as string;
    if (!url || !isValidUrl(url)) {
      throw new Error("Invalid or missing url");
    }

    const normalized = normalizeUrl(url);
    const allowed = await isAllowedByRobots(normalized);
    if (!allowed) {
      throw new Error("Blocked by robots.txt");
    }

    const page = await fetchPage(normalized);
    const metadata = extractMetadata(page.html, normalized);
    const checks = runSeoChecks(metadata, page.statusCode);
    const score = scoreChecks(checks);

    return { url: normalized, score, checks, metadata };
  },
};
