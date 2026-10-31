import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const productionCompose = readFileSync("docker-compose.production.yml", "utf8");

function serviceBlock(name: string): string {
  const match = productionCompose.match(
    new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z0-9-]*:\\n|^volumes:\\n|(?![\\s\\S]))`, "m"),
  );
  if (!match) throw new Error(`Service ${name} not found in production Compose file`);
  return match[1];
}

describe("production database persistence", () => {
  it("mounts SQLite storage into the API and migration service", () => {
    const api = serviceBlock("api");
    const migrate = serviceBlock("migrate");
    expect(api).toContain("DATABASE_URL: file:/app/data/presensi.db");
    expect(api).toContain("sqlite_data:/app/data");
    expect(migrate).toContain("sqlite_data:/app/data");
    expect(productionCompose).toContain("name: ${VOLUME_PREFIX:-presensi}_sqlite_data");
    expect(productionCompose).not.toContain("postgres");
  });
});
