import { describe, it, expect } from "vitest";
import { normalizeUrl, isValidUrl } from "./url-utils.js";

describe("normalizeUrl", () => {
  it("removes trailing slash from pathname", () => {
    expect(normalizeUrl("https://example.com/page/")).toBe("https://example.com/page");
  });

  it("keeps root path as single slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("strips hash fragment", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });

  it("preserves query string", () => {
    expect(normalizeUrl("https://example.com/page?foo=bar")).toBe("https://example.com/page?foo=bar");
  });
});

describe("isValidUrl", () => {
  it("accepts valid http URLs", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("accepts valid https URLs", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("rejects ftp URLs", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects javascript: protocol", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });
});
