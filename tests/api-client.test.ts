import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../lib/data/api-client";

describe("guard URL API", () => {
  it.each(["https://evil.example/x", "students/%2e%2e/admin"])(
    "menolak path yang keluar dari alamat dasar: %s",
    async (path) => {
      const fetcher = vi.fn<typeof fetch>();
      const request = createApiClient("https://school.example/api/v1/", fetcher);
      await expect(request(path, {}, (value) => value)).rejects.toThrow(TypeError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("mengirim ID ter-encode sebagai segmen path", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "class/id" }), {
        headers: { "content-type": "application/json" },
      }),
    );
    const request = createApiClient("https://school.example/api/v1/", fetcher);
    await request(`classes/${encodeURIComponent("class/id")}`, {}, (value) => value);

    expect(String(fetcher.mock.calls[0][0])).toBe("https://school.example/api/v1/classes/class%2Fid");
  });
});
