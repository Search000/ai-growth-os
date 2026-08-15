import robotsParserPkg from "robots-parser";
import { logger } from "../logger.js";

const robotsParser = robotsParserPkg as unknown as (
  url: string,
  contents: string
) => { isAllowed: (url: string, ua?: string) => boolean | undefined };

export async function isAllowedByRobots(targetUrl: string, userAgent = "AIGrowthOSBot"): Promise<boolean> {
  try {
    const url = new URL(targetUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      return true;
    }

    const body = await response.text();
    const robots = robotsParser(robotsUrl, body);
    return robots.isAllowed(targetUrl, userAgent) ?? true;
  } catch (err) {
    logger.warn({ err, targetUrl }, "robots.txt check failed, defaulting to allowed");
    return true;
  }
}
