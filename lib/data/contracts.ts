import type { AuditEntry, ClassSummary, HistoryRow, RecapRow, Role, Status, StudentRow } from "../types";

export interface SessionUser {
  id: string;
  nama: string;
  email: string;
  role: Role;
  kelasId: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  kelasId: string;
  nis: string;
  status: Status;
  waktu: string | null;
  keterangan: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AttendanceBatch {
  date: string;
  kelasId: string;
  records: Array<Pick<AttendanceRecord, "nis" | "status" | "waktu" | "keterangan">>;
}

export interface AttendanceHistoryQuery {
  kelasId: string;
  from: string;
  to: string;
}

export interface AttendanceReportQuery extends AttendanceHistoryQuery {
  status?: Status;
}

export interface AttendanceReport {
  kelas: SchoolClass;
  from: string;
  to: string;
  effectiveDays: number;
  rows: RecapRow[];
}

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
  search?: string;
  kelasId?: string;
  status?: "all" | "active" | "inactive";
  includeInactive?: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}

export interface CreateStudentInput {
  nis: string;
  nama: string;
  kelasId: string;
}

export interface CreateTeacherInput {
  nip: string;
  nama: string;
}

export interface CreateAccountInput {
  nama: string;
  email: string;
  role: Role;
  kelasId: string | null;
}

export interface CreateClassInput {
  nama: string;
  jurusan: string;
}

export interface SchoolStudent extends StudentRow {
  status: "active" | "inactive";
}

export interface SchoolClass {
  id: string;
  nama: string;
  jurusan: string;
  ketuaAkunId: string | null;
  active: boolean;
}

export interface SchoolTeacher {
  id: string;
  nip: string;
  nama: string;
  status: "active" | "inactive";
}

export interface SchoolAccount {
  id: string;
  nama: string;
  email: string;
  role: Role;
  kelasId: string | null;
  active: boolean;
}

export interface AuthRepository {
  getSession(signal?: AbortSignal): Promise<SessionUser | null>;
  login(credentials: LoginCredentials, signal?: AbortSignal): Promise<SessionUser>;
  logout(signal?: AbortSignal): Promise<void>;
}

export interface AttendanceRepository {
  listClassAttendance(kelasId: string, date: string, signal?: AbortSignal): Promise<AttendanceRecord[]>;
  saveClassAttendance(batch: AttendanceBatch, signal?: AbortSignal): Promise<AttendanceRecord[]>;
  updateAttendance(id: string, changes: Pick<AttendanceRecord, "status" | "waktu" | "keterangan">, signal?: AbortSignal): Promise<AttendanceRecord>;
  deleteAttendance(id: string, signal?: AbortSignal): Promise<void>;
  getHistory(query: AttendanceHistoryQuery, signal?: AbortSignal): Promise<HistoryRow[]>;
  getReport(query: AttendanceReportQuery, signal?: AbortSignal): Promise<AttendanceReport>;
}

export interface SchoolRepository {
  listClasses(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolClass>>;
  createClass(input: CreateClassInput, signal?: AbortSignal): Promise<SchoolClass>;
  updateClass(id: string, input: CreateClassInput, signal?: AbortSignal): Promise<SchoolClass>;
  assignClassLeader(kelasId: string, accountId: string | null, signal?: AbortSignal): Promise<SchoolClass>;
  deleteClass(id: string, signal?: AbortSignal): Promise<void>;
  listStudents(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolStudent>>;
  createStudent(input: CreateStudentInput, signal?: AbortSignal): Promise<SchoolStudent>;
  updateStudent(id: string, input: CreateStudentInput, signal?: AbortSignal): Promise<SchoolStudent>;
  setStudentActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolStudent>;
  deleteStudent(id: string, signal?: AbortSignal): Promise<void>;
}

export interface AdminRepository {
  listTeachers(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolTeacher>>;
  createTeacher(input: CreateTeacherInput, signal?: AbortSignal): Promise<SchoolTeacher>;
  updateTeacher(id: string, input: CreateTeacherInput, signal?: AbortSignal): Promise<SchoolTeacher>;
  setTeacherActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolTeacher>;
  deleteTeacher(id: string, signal?: AbortSignal): Promise<void>;
  listAccounts(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<SchoolAccount>>;
  createAccount(input: CreateAccountInput, signal?: AbortSignal): Promise<SchoolAccount>;
  updateAccount(id: string, input: CreateAccountInput, signal?: AbortSignal): Promise<SchoolAccount>;
  setAccountActive(id: string, active: boolean, signal?: AbortSignal): Promise<SchoolAccount>;
  deleteAccount(id: string, signal?: AbortSignal): Promise<void>;
  requestPasswordReset(userId: string, signal?: AbortSignal): Promise<{ accepted: boolean }>;
}

export interface MonitoringRepository {
  getClassSummary(date: string, signal?: AbortSignal): Promise<Array<ClassSummary & Pick<SchoolClass, "id" | "nama" | "jurusan">>>;
  getClassAttendance(kelasId: string, date: string, signal?: AbortSignal): Promise<AttendanceRecord[]>;
}

export interface ActivityRepository {
  listActivity(query?: PaginationQuery, signal?: AbortSignal): Promise<Page<AuditEntry>>;
}
