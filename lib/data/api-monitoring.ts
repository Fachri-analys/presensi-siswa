import { createConfiguredApiClient } from "./api-client";
import type { AttendanceRecord, ClassSummary, MonitoringRepository, SchoolClass } from "./contracts";
import { decodeAttendanceRecord, decodeClassSummary } from "./decoders";

export function createApiMonitoringRepository(fetcher?: typeof fetch): MonitoringRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async getClassSummary(date: string, signal?: AbortSignal): Promise<Array<ClassSummary & Pick<SchoolClass, "id" | "nama" | "jurusan">>> {
      return request(
        "monitoring/summary",
        {
          method: "GET",
          query: { date },
          signal,
        },
        (val: unknown) => (Array.isArray(val) ? val.map(decodeClassSummary) : []),
      );
    },

    async getClassAttendance(kelasId: string, date: string, signal?: AbortSignal): Promise<AttendanceRecord[]> {
      return request(
        "attendance",
        {
          method: "GET",
          query: { kelasId, date },
          signal,
        },
        (val: unknown) => (Array.isArray(val) ? val.map(decodeAttendanceRecord) : []),
      );
    },
  };
}
