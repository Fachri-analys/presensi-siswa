"use client";

import { getStudentRows } from "./mock";

export type DemoStudent = ReturnType<typeof getStudentRows>[number] & { status: "active" | "inactive" };

const STORAGE_KEY = "presensi-demo-students";
const INITIAL_STUDENTS: DemoStudent[] = getStudentRows().map((student) => ({ ...student, status: "active" }));
let students = INITIAL_STUDENTS;
let loaded = false;
const listeners = new Set<() => void>();

function isDemoStudentList(value: unknown): value is DemoStudent[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" &&
    item !== null &&
    "id" in item && typeof item.id === "string" &&
    "nis" in item && typeof item.nis === "string" &&
    "nama" in item && typeof item.nama === "string" &&
    "kelasId" in item && typeof item.kelasId === "string" &&
    "status" in item && (item.status === "active" || item.status === "inactive")
  );
}

function loadStudents() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!isDemoStudentList(parsed)) throw new Error("Format data siswa demo tidak valid.");
    students = parsed;
  } catch (error) {
    console.error("Data siswa demo tidak dapat dibaca.", error);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDemoStudents() {
  loadStudents();
  return students;
}

export function getDemoStudentsServerSnapshot() {
  return INITIAL_STUDENTS;
}

export function subscribeToDemoStudents(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateDemoStudents(update: (current: DemoStudent[]) => DemoStudent[]) {
  loadStudents();
  students = update(students);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch (error) {
      console.error("Perubahan data siswa hanya tersimpan selama halaman ini dibuka.", error);
    }
  }
  notify();
}
