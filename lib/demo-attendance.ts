"use client";

import type { ClassSummary, HistoryRow, RecapRow, Status } from "./types";
import type { DemoStudent } from "./demo-students";

export type DemoAttendanceRecord = {
  status: Status | null;
  waktu: string | null;
  keterangan: string;
};

type AttendanceStore = Record<string, Record<string, DemoAttendanceRecord>>;

const STORAGE_KEY = "presensi-demo-attendance";
const EMPTY_ATTENDANCE: AttendanceStore = {};
const VALID_STATUSES: Status[] = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA"];
let attendance: AttendanceStore = EMPTY_ATTENDANCE;
let loaded = false;
const listeners = new Set<() => void>();

const storeKey = (classId: string, date: string) => `${date}::${classId}`;

function getClassDays(store: AttendanceStore, classId: string, from: string, to: string) {
  return Object.entries(store)
    .flatMap(([key, records]) => {
      const separator = key.indexOf("::");
      const date = key.slice(0, separator);
      return key.slice(separator + 2) === classId && date >= from && date <= to && Object.keys(records).length
        ? [{ date, records }]
        : [];
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 92);
}

export function getStoredAttendanceHistory(
  store: AttendanceStore,
  classId: string,
  from: string,
  to: string,
): HistoryRow[] {
  return getClassDays(store, classId, from, to).map(({ date, records }) => {
    const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 };
    for (const { status } of Object.values(records)) {
      if (status === "HADIR" || status === "TERLAMBAT") counts.hadir++;
      if (status === "TERLAMBAT") counts.terlambat++;
      if (status === "IZIN") counts.izin++;
      if (status === "SAKIT") counts.sakit++;
      if (status === "ALPA") counts.alpa++;
    }
    return { date, ...counts };
  });
}

export function getStoredAttendanceRecap(
  store: AttendanceStore,
  classId: string,
  from: string,
  to: string,
  students: DemoStudent[],
): { rows: RecapRow[]; days: number } | null {
  const days = getClassDays(store, classId, from, to);
  if (!days.length) return null;
  const rows = students
    .filter((student) => student.kelasId === classId && student.status === "active")
    .map((student) => {
      const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 };
      for (const { records } of days) {
        const status = records[student.nis]?.status;
        if (status === "HADIR" || status === "TERLAMBAT") counts.hadir++;
        if (status === "TERLAMBAT") counts.terlambat++;
        if (status === "IZIN") counts.izin++;
        if (status === "SAKIT") counts.sakit++;
        if (status === "ALPA") counts.alpa++;
      }
      return { nis: student.nis, nama: student.nama, ...counts };
    });
  return { rows, days: days.length };
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is DemoAttendanceRecord {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (item.status === null || VALID_STATUSES.includes(item.status as Status)) &&
    (typeof item.waktu === "string" || item.waktu === null) &&
    typeof item.keterangan === "string";
}

function isAttendanceStore(value: unknown): value is AttendanceStore {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.entries(value).every(([key, records]) =>
      /^\d{4}-\d{2}-\d{2}::.+$/.test(key) &&
      typeof records === "object" && records !== null && !Array.isArray(records) &&
      Object.entries(records).every(([nis, record]) => /^\d+$/.test(nis) && isRecord(record))
    );
}

function loadAttendance() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!isAttendanceStore(parsed)) throw new Error("Format data presensi demo tidak valid.");
    attendance = parsed;
  } catch (error) {
    console.error("Data presensi demo tidak dapat dibaca.", error);
  }
}

export function getDemoAttendance(): AttendanceStore {
  loadAttendance();
  return attendance;
}

export function getDemoAttendanceServerSnapshot(): AttendanceStore {
  return EMPTY_ATTENDANCE;
}

export function getStoredClassSummary(
  store: AttendanceStore,
  classId: string,
  date: string,
  activeStudentNis: string[],
): Pick<ClassSummary, "siswa" | "hadir" | "izin" | "sakit" | "alpa" | "terlambat"> | null {
  const records = store[storeKey(classId, date)];
  if (!records || !Object.keys(records).length) return null;
  const activeNis = new Set(activeStudentNis);
  const counts = { siswa: activeStudentNis.length, hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 };
  for (const [nis, { status }] of Object.entries(records)) {
    if (!activeNis.has(nis)) continue;
    if (status === "HADIR" || status === "TERLAMBAT") counts.hadir++;
    if (status === "TERLAMBAT") counts.terlambat++;
    if (status === "IZIN") counts.izin++;
    if (status === "SAKIT") counts.sakit++;
    if (status === "ALPA") counts.alpa++;
  }
  return counts;
}

export function subscribeToDemoAttendance(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: AttendanceStore): boolean {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    attendance = next;
    listeners.forEach((listener) => listener());
    return true;
  } catch (error) {
    console.error("Presensi demo tidak berhasil disimpan.", error);
    return false;
  }
}

export function saveDemoAttendance(classId: string, date: string, records: Record<string, DemoAttendanceRecord>): boolean {
  loadAttendance();
  return commit({ ...attendance, [storeKey(classId, date)]: records });
}
