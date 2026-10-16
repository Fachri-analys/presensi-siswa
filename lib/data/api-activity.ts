import { createConfiguredApiClient } from "./api-client";
import type { ActivityRepository, AuditEntry, Page, PaginationQuery } from "./contracts";
import { decodeAuditEntry, decodePage } from "./decoders";

export function createApiActivityRepository(fetcher?: typeof fetch): ActivityRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async listActivity(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<AuditEntry>> {
      return request(
        "audit-logs",
        {
          method: "GET",
          query: {
            page: query?.cursor ? Number(query.cursor) : 1,
            limit: query?.limit ?? 20,
            search: query?.search,
          },
          signal,
        },
        (val: unknown) => decodePage(val, decodeAuditEntry),
      );
    },
  };
}
