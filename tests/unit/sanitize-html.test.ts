import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/app/(site)/news/[slug]/page";

/** Whitelist sanitizer per WORKPLAN §5.6 — script, iframe, inline handlers and javascript: URIs are removed. */

describe("sanitizeArticleHtml", () => {
  it("keeps whitelisted structure tags", () => {
    const html = "<p>a</p><h2>b</h2><h3>c</h3><blockquote>q</blockquote><ul><li>li</li></ul>";
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("keeps inline em/strong and safe anchors", () => {
    const html = '<p><em>x</em> <strong>y</strong> <a href="https://example.com">z</a></p>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("strips script blocks entirely", () => {
    expect(sanitizeArticleHtml('<p>ok</p><script>alert("x")</script>')).toBe("<p>ok</p>");
    expect(sanitizeArticleHtml("<script src=evil.js></script><p>ok</p>")).toBe("<p>ok</p>");
  });

  it("strips style + iframe blocks", () => {
    expect(sanitizeArticleHtml("<style>body{}</style><p>ok</p>")).toBe("<p>ok</p>");
    expect(sanitizeArticleHtml('<iframe src="https://evil"></iframe><p>ok</p>')).toBe("<p>ok</p>");
  });

  it("strips inline event handlers (double + single quoted)", () => {
    expect(sanitizeArticleHtml('<p onclick="evil()">ok</p>')).toBe("<p>ok</p>");
    expect(sanitizeArticleHtml("<p onmouseover='evil()'>ok</p>")).toBe("<p>ok</p>");
  });

  it("neutralizes javascript: URIs", () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("leaves plain text untouched", () => {
    expect(sanitizeArticleHtml("hello world")).toBe("hello world");
  });
});
