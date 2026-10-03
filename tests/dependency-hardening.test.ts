import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const braces = require("braces") as (pattern: string) => string[];

describe("patched braces dependency", () => {
  it("rejects deeply nested patterns before recursive processing", () => {
    const input = `${"{".repeat(101)}value${"}".repeat(101)}`;

    expect(() => braces(input)).toThrow(/exceeds max depth/);
    expect(braces("{one,two}")).toEqual(["(one|two)"]);
  });
});
