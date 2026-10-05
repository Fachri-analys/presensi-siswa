"use client";

export type AttendanceSessionId = "pagi" | "siang";

export interface AttendanceSessionSchedule {
  mulai: string;
  selesai: string;
  terkunci: boolean;
}

export interface DemoAttendanceSchedule {
  pagi: AttendanceSessionSchedule;
  siang: AttendanceSessionSchedule;
}

export const DEFAULT_ATTENDANCE_SCHEDULE: DemoAttendanceSchedule = {
  pagi: { mulai: "07:00", selesai: "12:00", terkunci: false },
  siang: { mulai: "13:00", selesai: "17:00", terkunci: false },
};

const STORAGE_KEY = "presensi-demo-schedule";
let schedule = DEFAULT_ATTENDANCE_SCHEDULE;
let loaded = false;
const listeners = new Set<() => void>();

function isSessionSchedule(value: unknown): value is AttendanceSessionSchedule {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return typeof session.mulai === "string" &&
    typeof session.selesai === "string" &&
    typeof session.terkunci === "boolean";
}

export function isValidAttendanceSchedule(value: DemoAttendanceSchedule): boolean {
  const sessions = [value.pagi, value.siang];
  if (!sessions.every((session) =>
    isSessionSchedule(session) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(session.mulai) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(session.selesai) &&
    session.mulai < session.selesai
  )) return false;

  return value.pagi.selesai <= value.siang.mulai;
}

function isDemoAttendanceSchedule(value: unknown): value is DemoAttendanceSchedule {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return isSessionSchedule(candidate.pagi) &&
    isSessionSchedule(candidate.siang) &&
    isValidAttendanceSchedule({ pagi: candidate.pagi, siang: candidate.siang });
}

function notify() {
  listeners.forEach((listener) => listener());
}

function loadSchedule() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!isDemoAttendanceSchedule(parsed)) throw new Error("Format jadwal presensi demo tidak valid.");
    schedule = parsed;
  } catch (error) {
    console.error("Jadwal presensi demo tidak dapat dibaca.", error);
  }
}

export function getDemoAttendanceSchedule(): DemoAttendanceSchedule {
  loadSchedule();
  return schedule;
}

export function getDemoAttendanceScheduleServerSnapshot(): DemoAttendanceSchedule {
  return DEFAULT_ATTENDANCE_SCHEDULE;
}

export function subscribeToDemoAttendanceSchedule(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveDemoAttendanceSchedule(next: DemoAttendanceSchedule): boolean {
  if (!isValidAttendanceSchedule(next)) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    schedule = next;
    notify();
    return true;
  } catch (error) {
    console.error("Jadwal presensi demo tidak berhasil disimpan.", error);
    return false;
  }
}

export function getJakartaMinutes(date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: "hour" | "minute") => Number(parts.find((item) => item.type === type)?.value);
  return part("hour") * 60 + part("minute");
}

export function getOpenAttendanceSession(
  value: DemoAttendanceSchedule,
  nowMinutes = getJakartaMinutes(),
): AttendanceSessionId | null {
  for (const session of ["pagi", "siang"] as const) {
    const { mulai, selesai, terkunci } = value[session];
    const startMinutes = Number(mulai.slice(0, 2)) * 60 + Number(mulai.slice(3));
    const endMinutes = Number(selesai.slice(0, 2)) * 60 + Number(selesai.slice(3));
    if (!terkunci && nowMinutes >= startMinutes && nowMinutes < endMinutes) return session;
  }
  return null;
}

export function canMarkPresent(isWindowOpen: boolean, hasTeacherApproval: boolean): boolean {
  return isWindowOpen || hasTeacherApproval;
}
