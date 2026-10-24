import { createConfiguredApiClient } from "./api-client";
import type {
  AdminRepository,
  CreateAccountInput,
  CreateTeacherInput,
  Page,
  PaginationQuery,
  SchoolAccount,
  SchoolTeacher,
  UpdateAccountInput,
} from "./contracts";
import { decodeAccount, decodePage, decodeTeacher } from "./decoders";

export function createApiAdminRepository(fetcher?: typeof fetch): AdminRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async listTeachers(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolTeacher>> {
      return request(
        "teachers",
        {
          method: "GET",
          query: query ? { search: query.search } : undefined,
          signal,
        },
        (val: unknown) => {
          if (Array.isArray(val)) {
            const items = val.map(decodeTeacher);
            return { items, nextCursor: null, total: items.length };
          }
          return decodePage(val, decodeTeacher);
        },
      );
    },

    async createTeacher(input: CreateTeacherInput, signal?: AbortSignal): Promise<SchoolTeacher> {
      return request(
        "teachers",
        {
          method: "POST",
          body: input,
          signal,
        },
        decodeTeacher,
      );
    },

    async updateTeacher(id: string, input: CreateTeacherInput, signal?: AbortSignal): Promise<SchoolTeacher> {
      return request(
        `teachers/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          signal,
        },
        decodeTeacher,
      );
    },

    async setTeacherActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolTeacher> {
      return request(
        `teachers/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: { status: active ? "active" : "inactive" },
          signal,
        },
        decodeTeacher,
      );
    },

    async deleteTeacher(id: string, signal?: AbortSignal): Promise<void> {
      return request(
        `teachers/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          signal,
        },
        () => undefined,
      );
    },

    async listAccounts(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolAccount>> {
      return request(
        "users",
        {
          method: "GET",
          query: {
            page: query?.cursor ? Number(query.cursor) : 1,
            limit: query?.limit ?? 20,
            search: query?.search,
            status: query?.status === "all" ? undefined : query?.status,
          },
          signal,
        },
        (val: unknown) => decodePage(val, decodeAccount),
      );
    },

    async createAccount(input: CreateAccountInput, signal?: AbortSignal): Promise<SchoolAccount> {
      return request(
        "users",
        {
          method: "POST",
          body: input,
          signal,
        },
        decodeAccount,
      );
    },

    async updateAccount(id: string, input: UpdateAccountInput, signal?: AbortSignal): Promise<SchoolAccount> {
      return request(
        `users/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          signal,
        },
        decodeAccount,
      );
    },

    async setAccountActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolAccount> {
      return request(
        `users/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: { status: active ? "active" : "inactive" },
          signal,
        },
        decodeAccount,
      );
    },

    async deleteAccount(id: string, signal?: AbortSignal): Promise<void> {
      return request(
        `users/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          signal,
        },
        () => undefined,
      );
    },
  };
}
