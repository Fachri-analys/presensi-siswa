import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const braces = require("braces") as (pattern: string) => string[];

describe("patched braces dependency", () => {
  it("uses the reviewed immutable upstream fix commit with lockfile integrity", () => {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { dev?: boolean; integrity?: string; resolved?: string }>;
    };
    const entry = lock.packages["node_modules/braces"];

    expect(entry.dev).toBe(true);
    expect(entry.resolved).toBe(
      "https://codeload.github.com/FSDevelop/braces/tar.gz/28d440b5dd449dbf1fe6f3506cf94ecca4d02660",
    );
    expect(entry.integrity).toMatch(/^sha512-/);
  });

  it("rejects deeply nested patterns before recursive processing", () => {
    const input = `${"{".repeat(101)}value${"}".repeat(101)}`;

    expect(() => braces(input)).toThrow(/exceeds max depth/);
    expect(braces("{one,two}")).toEqual(["(one|two)"]);
  });
});
