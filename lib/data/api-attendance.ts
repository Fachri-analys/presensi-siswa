import { createConfiguredApiClient } from "./api-client";
import type {
  AttendanceBatch,
  AttendanceHistoryQuery,
  AttendanceRecord,
  AttendanceReport,
  AttendanceReportQuery,
  AttendanceRepository,
  HistoryRow,
} from "./contracts";
import { decodeAttendanceRecord, decodeAttendanceReport, decodeHistoryRow } from "./decoders";

export function createApiAttendanceRepository(fetcher?: typeof fetch): AttendanceRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;

  return {
    async listClassAttendance(kelasId: string, date: string, signal?: AbortSignal): Promise<AttendanceRecord[]> {
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

    async saveClassAttendance(batch: AttendanceBatch, signal?: AbortSignal): Promise<AttendanceRecord[]> {
      return request(
        "attendance/batch",
        {
          method: "POST",
          body: batch,
          signal,
        },
        (val: unknown) => (Array.isArray(val) ? val.map(decodeAttendanceRecord) : []),
      );
    },

    async updateAttendance(
      id: string,
      changes: Pick<AttendanceRecord, "status" | "waktu" | "keterangan">,
      signal?: AbortSignal,
    ): Promise<AttendanceRecord> {
      return request(
        `attendance/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: changes,
          signal,
        },
        decodeAttendanceRecord,
      );
    },

    async deleteAttendance(id: string, signal?: AbortSignal): Promise<void> {
      return request(
        `attendance/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          signal,
        },
        () => undefined,
      );
    },

    async getHistory(query: AttendanceHistoryQuery, signal?: AbortSignal): Promise<HistoryRow[]> {
      return request(
        "attendance/history",
        {
          method: "GET",
          query: {
            kelasId: query.kelasId,
            from: query.from,
            to: query.to,
          },
          signal,
        },
        (val: unknown) => (Array.isArray(val) ? val.map(decodeHistoryRow) : []),
      );
    },

    async getReport(query: AttendanceReportQuery, signal?: AbortSignal): Promise<AttendanceReport> {
      return request(
        "attendance/recap",
        {
          method: "GET",
          query: {
            kelasId: query.kelasId,
            from: query.from,
            to: query.to,
          },
          signal,
        },
        decodeAttendanceReport,
      );
    },
  };
}
