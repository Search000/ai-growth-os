import { describe, it, expect } from "vitest";
import { runSeoChecks, scoreChecks } from "./rules.js";
import type { PageMetadata } from "../crawler/metadata.js";

function makeMetadata(overrides: Partial<PageMetadata> = {}): PageMetadata {
  return {
    title: "A Well Optimized Page Title Example",
    metaDescription: "This is a meta description that is long enough to pass the recommended 70 to 160 character range for SEO purposes.",
    canonical: "https://example.com/",
    robotsDirective: null,
    h1: ["Main Heading"],
    h2: ["Subheading"],
    internalLinks: ["https://example.com/about"],
    externalLinks: [],
    images: [{ src: "img.jpg", alt: "description" }],
    wordCount: 500,
    ...overrides,
  };
}

describe("runSeoChecks", () => {
  it("passes all checks for a well-optimized page", () => {
    const results = runSeoChecks(makeMetadata(), 200);
    const failing = results.filter((r) => r.status === "fail");
    expect(failing).toHaveLength(0);
  });

  it("fails http-status check for non-2xx status code", () => {
    const results = runSeoChecks(makeMetadata(), 404);
    const httpCheck = results.find((r) => r.id === "http-status");
    expect(httpCheck?.status).toBe("fail");
  });

  it("fails title check when title is missing", () => {
    const results = runSeoChecks(makeMetadata({ title: null }), 200);
    const titleCheck = results.find((r) => r.id === "title");
    expect(titleCheck?.status).toBe("fail");
  });

  it("warns when title length is out of recommended range", () => {
    const results = runSeoChecks(makeMetadata({ title: "Short" }), 200);
    const titleCheck = results.find((r) => r.id === "title");
    expect(titleCheck?.status).toBe("warn");
  });

  it("fails h1 check when no H1 is present", () => {
    const results = runSeoChecks(makeMetadata({ h1: [] }), 200);
    const h1Check = results.find((r) => r.id === "h1");
    expect(h1Check?.status).toBe("fail");
  });

  it("warns when multiple H1 tags are present", () => {
    const results = runSeoChecks(makeMetadata({ h1: ["One", "Two"] }), 200);
    const h1Check = results.find((r) => r.id === "h1");
    expect(h1Check?.status).toBe("warn");
  });

  it("fails indexability check when noindex directive is present", () => {
    const results = runSeoChecks(makeMetadata({ robotsDirective: "noindex, nofollow" }), 200);
    const indexCheck = results.find((r) => r.id === "indexability");
    expect(indexCheck?.status).toBe("fail");
  });

  it("warns on thin content under 300 words", () => {
    const results = runSeoChecks(makeMetadata({ wordCount: 100 }), 200);
    const contentCheck = results.find((r) => r.id === "content-length");
    expect(contentCheck?.status).toBe("warn");
  });

  it("warns when images are missing alt text", () => {
    const results = runSeoChecks(makeMetadata({ images: [{ src: "img.jpg", alt: null }] }), 200);
    const altCheck = results.find((r) => r.id === "image-alt");
    expect(altCheck?.status).toBe("warn");
  });
});

describe("scoreChecks", () => {
  it("returns 100 when all checks pass", () => {
    const score = scoreChecks([
      { id: "a", label: "A", status: "pass", message: "" },
      { id: "b", label: "B", status: "pass", message: "" },
    ]);
    expect(score).toBe(100);
  });

  it("returns 0 when all checks fail", () => {
    const score = scoreChecks([
      { id: "a", label: "A", status: "fail", message: "" },
      { id: "b", label: "B", status: "fail", message: "" },
    ]);
    expect(score).toBe(0);
  });

  it("returns 50 when checks are half pass half fail", () => {
    const score = scoreChecks([
      { id: "a", label: "A", status: "pass", message: "" },
      { id: "b", label: "B", status: "fail", message: "" },
    ]);
    expect(score).toBe(50);
  });

  it("weights warn as half credit", () => {
    const score = scoreChecks([{ id: "a", label: "A", status: "warn", message: "" }]);
    expect(score).toBe(50);
  });
});
