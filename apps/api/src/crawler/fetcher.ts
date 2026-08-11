import { logger } from "../logger.js";

export interface FetchedPage {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  durationMs: number;
}

export async function fetchPage(url: string, timeoutMs = 10000): Promise<FetchedPage> {
  const start = Date.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "AIGrowthOSBot/0.1" },
  });

  const html = await response.text();
  const durationMs = Date.now() - start;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  logger.info({ url, statusCode: response.status, durationMs }, "Page fetched");

  return {
    url,
    statusCode: response.status,
    headers,
    html,
    durationMs,
  };
}
