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

describe("production database security", () => {
  it("connects the API with a dedicated runtime account, not the bootstrap superuser", () => {
    const api = serviceBlock("api");
    expect(api).toMatch(/DATABASE_URL:\s*postgresql:\/\/\$\{POSTGRES_APP_USER\}:\$\{POSTGRES_APP_PASSWORD\}@db:/);
    expect(api).not.toMatch(/DATABASE_URL:\s*postgresql:\/\/\$\{POSTGRES_USER\}/);
    expect(api).toMatch(/db-init:\n\s+condition: service_completed_successfully/);
  });

  it("creates a non-superuser runtime role with data access but no schema creation", () => {
    const initializer = readFileSync("scripts/ensure-runtime-db-user.sh", "utf8");
    expect(initializer).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
    expect(initializer).toContain("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    expect(initializer).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES");
    expect(initializer).not.toContain("GRANT ALL PRIVILEGES");
  });
});
