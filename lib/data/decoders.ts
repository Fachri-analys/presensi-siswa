import type { ClassSummary, HistoryRow, RecapRow, Role, Status } from "../types";
import type {
  AttendanceReport,
  AttendanceRecord,
  Page,
  SchoolAccount,
  SchoolClass,
  SchoolStudent,
  SchoolTeacher,
  SessionUser,
} from "./contracts";

export class ApiDecodeError extends Error {
  constructor(path: string) {
    super(`Bentuk data backend tidak sesuai pada ${path}.`);
    this.name = "ApiDecodeError";
  }
}

type JsonObject = Record<string, unknown>;

function object(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ApiDecodeError(path);
  return value as JsonObject;
}

function text(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ApiDecodeError(path);
  return value;
}

function optionalText(value: unknown, path: string): string | null {
  if (value === null) return null;
  return text(value, path);
}

function dateText(value: unknown, path: string): string {
  const date = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new ApiDecodeError(path);
  }
  return date;
}

function optionalTimeText(value: unknown, path: string): string | null {
  if (value === null) return null;
  const time = text(value, path);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time) ||
      Number(time.slice(0, 2)) > 23 || Number(time.slice(3, 5)) > 59 ||
      (time.length === 8 && Number(time.slice(6, 8)) > 59)) {
    throw new ApiDecodeError(path);
  }
  return time;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiDecodeError(path);
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (!Number.isInteger(number) || number < 0) throw new ApiDecodeError(path);
  return number;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ApiDecodeError(path);
  return value;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== "string" || !values.some((item) => item === value)) throw new ApiDecodeError(path);
  return value as T;
}

const ROLES: readonly Role[] = ["KETUA_KELAS", "GURU_PIKET", "ADMIN"];
const STATUSES: readonly Status[] = ["HADIR", "TERLAMBAT", "IZIN", "SAKIT", "ALPA"];
const ACTIVE_STATES = ["active", "inactive"] as const;

export function decodeSessionUser(value: unknown): SessionUser {
  const data = object(value, "session");
  return {
    id: text(data.id, "session.id"),
    nama: text(data.nama, "session.nama"),
    email: text(data.email, "session.email"),
    role: enumValue(data.role, ROLES, "session.role"),
    kelasId: optionalText(data.kelasId, "session.kelasId"),
  };
}

export function decodeAttendanceRecord(value: unknown): AttendanceRecord {
  const data = object(value, "attendance");
  return {
    id: text(data.id, "attendance.id"),
    date: dateText(data.date, "attendance.date"),
    kelasId: text(data.kelasId, "attendance.kelasId"),
    nis: text(data.nis, "attendance.nis"),
    status: enumValue(data.status, STATUSES, "attendance.status"),
    waktu: optionalTimeText(data.waktu, "attendance.waktu"),
    keterangan: text(data.keterangan, "attendance.keterangan"),
    createdBy: text(data.createdBy, "attendance.createdBy"),
    updatedBy: text(data.updatedBy, "attendance.updatedBy"),
    updatedAt: text(data.updatedAt, "attendance.updatedAt"),
  };
}

export function decodeStudent(value: unknown): SchoolStudent {
  const data = object(value, "student");
  return {
    id: text(data.id, "student.id"),
    nis: text(data.nis, "student.nis"),
    nama: text(data.nama, "student.nama"),
    kelasId: text(data.kelasId, "student.kelasId"),
    status: enumValue(data.status, ACTIVE_STATES, "student.status"),
  };
}

export function decodeTeacher(value: unknown): SchoolTeacher {
  const data = object(value, "teacher");
  return {
    id: text(data.id, "teacher.id"),
    nip: text(data.nip, "teacher.nip"),
    nama: text(data.nama, "teacher.nama"),
    status: enumValue(data.status, ACTIVE_STATES, "teacher.status"),
  };
}

export function decodeClass(value: unknown): SchoolClass {
  const data = object(value, "class");
  return {
    id: text(data.id, "class.id"),
    nama: text(data.nama, "class.nama"),
    jurusan: text(data.jurusan, "class.jurusan"),
    ketuaAkunId: optionalText(data.ketuaAkunId, "class.ketuaAkunId"),
    active: boolean(data.active, "class.active"),
  };
}

export function decodeAccount(value: unknown): SchoolAccount {
  const data = object(value, "account");
  return {
    id: text(data.id, "account.id"),
    nama: text(data.nama, "account.nama"),
    email: text(data.email, "account.email"),
    role: enumValue(data.role, ROLES, "account.role"),
    kelasId: optionalText(data.kelasId, "account.kelasId"),
    active: boolean(data.active, "account.active"),
  };
}

export function decodePage<T>(value: unknown, decodeItem: (item: unknown) => T): Page<T> {
  const data = object(value, "page");
  if (!Array.isArray(data.items)) throw new ApiDecodeError("page.items");
  return {
    items: data.items.map(decodeItem),
    nextCursor: optionalText(data.nextCursor, "page.nextCursor"),
    total: nonNegativeInteger(data.total, "page.total"),
  };
}

export function decodeClassSummary(value: unknown): ClassSummary & { id: string; nama: string; jurusan: string } {
  const data = object(value, "classSummary");
  return {
    id: text(data.id, "classSummary.id"),
    nama: text(data.nama, "classSummary.nama"),
    jurusan: text(data.jurusan, "classSummary.jurusan"),
    siswa: nonNegativeInteger(data.siswa, "classSummary.siswa"),
    hadir: nonNegativeInteger(data.hadir, "classSummary.hadir"),
    izin: nonNegativeInteger(data.izin, "classSummary.izin"),
    sakit: nonNegativeInteger(data.sakit, "classSummary.sakit"),
    alpa: nonNegativeInteger(data.alpa, "classSummary.alpa"),
    terlambat: nonNegativeInteger(data.terlambat, "classSummary.terlambat"),
  };
}

export function decodeHistoryRow(value: unknown): HistoryRow {
  const data = object(value, "history");
  return {
    date: dateText(data.date, "history.date"),
    hadir: nonNegativeInteger(data.hadir, "history.hadir"),
    izin: nonNegativeInteger(data.izin, "history.izin"),
    sakit: nonNegativeInteger(data.sakit, "history.sakit"),
    alpa: nonNegativeInteger(data.alpa, "history.alpa"),
    terlambat: nonNegativeInteger(data.terlambat, "history.terlambat"),
  };
}

export function decodeRecapRow(value: unknown): RecapRow {
  const data = object(value, "recap");
  return {
    nis: text(data.nis, "recap.nis"),
    nama: text(data.nama, "recap.nama"),
    hadir: nonNegativeInteger(data.hadir, "recap.hadir"),
    izin: nonNegativeInteger(data.izin, "recap.izin"),
    sakit: nonNegativeInteger(data.sakit, "recap.sakit"),
    alpa: nonNegativeInteger(data.alpa, "recap.alpa"),
    terlambat: nonNegativeInteger(data.terlambat, "recap.terlambat"),
  };
}

export function decodeAttendanceReport(value: unknown): AttendanceReport {
  const data = object(value, "report");
  if (!Array.isArray(data.rows)) throw new ApiDecodeError("report.rows");
  return {
    kelas: decodeClass(data.kelas),
    from: dateText(data.from, "report.from"),
    to: dateText(data.to, "report.to"),
    effectiveDays: nonNegativeInteger(data.effectiveDays, "report.effectiveDays"),
    rows: data.rows.map(decodeRecapRow),
  };
}
