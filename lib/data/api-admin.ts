import { createConfiguredApiClient } from "./api-client";
import type {
  AdminRepository,
  CreateAccountInput,
  CreateTeacherInput,
  Page,
  PaginationQuery,
  SchoolAccount,
  SchoolTeacher,
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

    async listAccounts(_query?: PaginationQuery, _signal?: AbortSignal): Promise<Page<SchoolAccount>> {
      return { items: [], nextCursor: null, total: 0 };
    },

    async createAccount(_input: CreateAccountInput, _signal?: AbortSignal): Promise<SchoolAccount> {
      throw new Error("Method not implemented.");
    },

    async updateAccount(_id: string, _input: CreateAccountInput, _signal?: AbortSignal): Promise<SchoolAccount> {
      throw new Error("Method not implemented.");
    },

    async setAccountActive(_id: string, _active: boolean, _signal?: AbortSignal): Promise<SchoolAccount> {
      throw new Error("Method not implemented.");
    },

    async deleteAccount(_id: string, _signal?: AbortSignal): Promise<void> {
      throw new Error("Method not implemented.");
    },

    async requestPasswordReset(_userId: string, _signal?: AbortSignal): Promise<{ accepted: boolean }> {
      return { accepted: true };
    },
  };
}
