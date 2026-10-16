import { createConfiguredApiClient } from "./api-client";
import type {
  CreateClassInput,
  CreateStudentInput,
  Page,
  PaginationQuery,
  SchoolClass,
  SchoolRepository,
  SchoolStudent,
} from "./contracts";
import { decodeClass, decodePage, decodeStudent } from "./decoders";

export function createApiSchoolRepository(fetcher?: typeof fetch): SchoolRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async listClasses(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolClass>> {
      return request(
        "classes",
        {
          method: "GET",
          query: query ? { search: query.search } : undefined,
          signal,
        },
        (val: unknown) => {
          if (Array.isArray(val)) {
            const items = val.map(decodeClass);
            return { items, nextCursor: null, total: items.length };
          }
          return decodePage(val, decodeClass);
        },
      );
    },

    async createClass(input: CreateClassInput, signal?: AbortSignal): Promise<SchoolClass> {
      return request(
        "classes",
        {
          method: "POST",
          body: input,
          signal,
        },
        decodeClass,
      );
    },

    async updateClass(id: string, input: CreateClassInput, signal?: AbortSignal): Promise<SchoolClass> {
      return request(
        `classes/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          signal,
        },
        decodeClass,
      );
    },

    async assignClassLeader(kelasId: string, accountId: string | null, signal?: AbortSignal): Promise<SchoolClass> {
      return request(
        `classes/${encodeURIComponent(kelasId)}/leader`,
        {
          method: "PATCH",
          body: { leaderUserId: accountId },
          signal,
        },
        decodeClass,
      );
    },

    async deleteClass(id: string, signal?: AbortSignal): Promise<void> {
      return request(
        `classes/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          signal,
        },
        () => undefined,
      );
    },

    async listStudents(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolStudent>> {
      return request(
        "students",
        {
          method: "GET",
          query: {
            page: query?.cursor ? Number(query.cursor) : 1,
            limit: query?.limit ?? 20,
            search: query?.search,
            kelasId: query?.kelasId,
            status: query?.status === "all" ? undefined : query?.status,
          },
          signal,
        },
        (val: unknown) => decodePage(val, decodeStudent),
      );
    },

    async createStudent(input: CreateStudentInput, signal?: AbortSignal): Promise<SchoolStudent> {
      return request(
        "students",
        {
          method: "POST",
          body: input,
          signal,
        },
        decodeStudent,
      );
    },

    async updateStudent(id: string, input: CreateStudentInput, signal?: AbortSignal): Promise<SchoolStudent> {
      return request(
        `students/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          signal,
        },
        decodeStudent,
      );
    },

    async setStudentActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolStudent> {
      return request(
        `students/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: { status: active ? "active" : "inactive" },
          signal,
        },
        decodeStudent,
      );
    },

    async deleteStudent(id: string, signal?: AbortSignal): Promise<void> {
      return request(
        `students/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          signal,
        },
        () => undefined,
      );
    },
  };
}
