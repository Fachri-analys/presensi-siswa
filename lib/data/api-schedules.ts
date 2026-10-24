import { createConfiguredApiClient } from "./api-client";
import type { AttendanceSchedule, ScheduleRepository } from "./contracts";

function decodeSchedule(value: unknown): AttendanceSchedule {
  if (!value || typeof value !== "object") throw new Error("Respons jadwal tidak valid.");
  const data = value as Record<string, unknown>;
  if (typeof data.id !== "string" || (data.session !== "PAGI" && data.session !== "SIANG") || typeof data.mulai !== "string" || typeof data.selesai !== "string" || typeof data.terkunci !== "boolean") {
    throw new Error("Respons jadwal tidak valid.");
  }
  return { id: data.id, session: data.session, mulai: data.mulai, selesai: data.selesai, terkunci: data.terkunci };
}

export function createApiScheduleRepository(fetcher?: typeof fetch): ScheduleRepository | null {
  const request = createConfiguredApiClient(fetcher);
  if (!request) return null;
  return {
    async listSchedules(signal?: AbortSignal) {
      return request("schedules", { method: "GET", signal }, (value: unknown) => {
        const items = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items) ? (value as { items: unknown[] }).items : [];
        return items.map(decodeSchedule);
      });
    },
    updateSchedule(id, input, signal) {
      return request(`schedules/${encodeURIComponent(id)}`, { method: "PATCH", body: input, signal }, decodeSchedule);
    },
    toggleScheduleLock(id, signal) {
      return request(`schedules/${encodeURIComponent(id)}/toggle-lock`, { method: "POST", signal }, decodeSchedule);
    },
  };
}
