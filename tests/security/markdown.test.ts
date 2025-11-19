import { describe, expect, it } from "vitest";

import { containsSpoiler, sanitizePlainInput, sanitizeUserMarkdown } from "@/lib/security/markdown";

describe("security/markdown", () => {
  it("strips unsafe tags", () => {
    const dirty = "<h1>Hi</h1><script>alert('xss')</script>";
    const clean = sanitizeUserMarkdown(dirty);
    expect(clean).toContain("<h1>Hi</h1>");
    expect(clean).not.toContain("<script>");
  });

  it("detects spoilers", () => {
    expect(containsSpoiler("Here is a spoiler for the puzzle")).toBe(true);
    expect(containsSpoiler("Nothing to see here")).toBe(false);
  });

  it("sanitizes plain text inputs", () => {
    const output = sanitizePlainInput("<img src=x onerror=alert(1)>Hello", 20);
    expect(output).toEqual("Hello");
  });
});
