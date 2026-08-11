import type { PageMetadata } from "../crawler/metadata.js";
import type { SeoCheckResult } from "./types.js";

function check(id: string, label: string, status: SeoCheckResult["status"], message: string): SeoCheckResult {
  return { id, label, status, message };
}

export function runSeoChecks(metadata: PageMetadata, statusCode: number): SeoCheckResult[] {
  const results: SeoCheckResult[] = [];

  results.push(
    statusCode >= 200 && statusCode < 300
      ? check("http-status", "HTTP Status", "pass", `Page returned ${statusCode}`)
      : check("http-status", "HTTP Status", "fail", `Page returned ${statusCode}, not indexable`)
  );

  if (!metadata.title) {
    results.push(check("title", "Title Tag", "fail", "Missing <title> tag"));
  } else if (metadata.title.length < 30 || metadata.title.length > 60) {
    results.push(check("title", "Title Tag", "warn", `Title is ${metadata.title.length} chars, recommended 30-60`));
  } else {
    results.push(check("title", "Title Tag", "pass", `Title length OK (${metadata.title.length} chars)`));
  }

  if (!metadata.metaDescription) {
    results.push(check("meta-description", "Meta Description", "fail", "Missing meta description"));
  } else if (metadata.metaDescription.length < 70 || metadata.metaDescription.length > 160) {
    results.push(
      check(
        "meta-description",
        "Meta Description",
        "warn",
        `Description is ${metadata.metaDescription.length} chars, recommended 70-160`
      )
    );
  } else {
    results.push(check("meta-description", "Meta Description", "pass", "Meta description length OK"));
  }

  if (metadata.h1.length === 0) {
    results.push(check("h1", "H1 Heading", "fail", "No H1 found on page"));
  } else if (metadata.h1.length > 1) {
    results.push(check("h1", "H1 Heading", "warn", `${metadata.h1.length} H1 tags found, recommended exactly 1`));
  } else {
    results.push(check("h1", "H1 Heading", "pass", "Exactly one H1 found"));
  }

  results.push(
    metadata.canonical
      ? check("canonical", "Canonical Tag", "pass", `Canonical set: ${metadata.canonical}`)
      : check("canonical", "Canonical Tag", "warn", "No canonical tag found")
  );

  if (metadata.robotsDirective?.includes("noindex")) {
    results.push(check("indexability", "Indexability", "fail", "Page has noindex directive"));
  } else {
    results.push(check("indexability", "Indexability", "pass", "Page is indexable"));
  }

  const missingAlt = metadata.images.filter((img) => !img.alt || img.alt.trim() === "");
  if (metadata.images.length === 0) {
    results.push(check("image-alt", "Image Alt Text", "pass", "No images on page"));
  } else if (missingAlt.length > 0) {
    results.push(
      check("image-alt", "Image Alt Text", "warn", `${missingAlt.length}/${metadata.images.length} images missing alt text`)
    );
  } else {
    results.push(check("image-alt", "Image Alt Text", "pass", "All images have alt text"));
  }

  results.push(
    metadata.wordCount < 300
      ? check("content-length", "Content Length", "warn", `Only ${metadata.wordCount} words, thin content risk`)
      : check("content-length", "Content Length", "pass", `${metadata.wordCount} words`)
  );

  results.push(
    metadata.internalLinks.length === 0
      ? check("internal-links", "Internal Links", "warn", "No internal links found")
      : check("internal-links", "Internal Links", "pass", `${metadata.internalLinks.length} internal links found`)
  );

  return results;
}

export function scoreChecks(checks: SeoCheckResult[]): number {
  const weights = { pass: 1, warn: 0.5, fail: 0 };
  const total = checks.reduce((sum, c) => sum + weights[c.status], 0);
  return Math.round((total / checks.length) * 100);
}
