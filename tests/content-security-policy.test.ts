import { describe, expect, it } from "vitest";
import { createContentSecurityPolicy } from "../lib/security/content-security-policy";

describe("production content security policy", () => {
  it("uses a request nonce, allows the configured API, and rejects inline script/style attributes", () => {
    const policy = createContentSecurityPolicy("request-nonce", "https://api.school.example");

    expect(policy).toContain("script-src 'self' 'nonce-request-nonce' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-request-nonce'");
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("style-src-attr 'none'");
    expect(policy).toContain("connect-src 'self' https://api.school.example");
    expect(policy).not.toContain("'unsafe-inline'");
  });
});
