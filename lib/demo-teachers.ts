"use client";

export type DemoTeacher = { id: string; nip: string; nama: string; status: "active" | "inactive" };

const STORAGE_KEY = "presensi-demo-teachers";
const EMPTY_TEACHERS: DemoTeacher[] = [];
let teachers: DemoTeacher[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function isDemoTeacherList(value: unknown): value is DemoTeacher[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" &&
    item !== null &&
    "id" in item && typeof item.id === "string" &&
    "nip" in item && typeof item.nip === "string" &&
    "nama" in item && typeof item.nama === "string" &&
    (!("status" in item) || item.status === "active" || item.status === "inactive")
  );
}

function loadTeachers() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!isDemoTeacherList(parsed)) throw new Error("Format data guru demo tidak valid.");
    teachers = parsed.map((teacher) => ({ ...teacher, status: teacher.status ?? "active" }));
  } catch (error) {
    console.error("Data guru demo tidak dapat dibaca.", error);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDemoTeachers() {
  loadTeachers();
  return teachers;
}

export function getDemoTeachersServerSnapshot() {
  return EMPTY_TEACHERS;
}

export function subscribeToDemoTeachers(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateDemoTeachers(update: (current: DemoTeacher[]) => DemoTeacher[]) {
  loadTeachers();
  teachers = update(teachers);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    } catch (error) {
      console.error("Perubahan data guru hanya tersimpan selama halaman ini dibuka.", error);
    }
  }
  notify();
}
