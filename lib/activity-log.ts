"use client";

export interface ActivityLogEntry {
  id: string;
  createdAt: string;
  action: string;
  description: string;
}

const STORAGE_KEY = "presensi-demo-activity-log";
const EMPTY_LOG: ActivityLogEntry[] = [];
let entries: ActivityLogEntry[] = EMPTY_LOG;
let loaded = false;
const listeners = new Set<() => void>();

function isActivityLog(value: unknown): value is ActivityLogEntry[] {
  return Array.isArray(value) && value.every((item) =>
    typeof item === "object" &&
    item !== null &&
    "id" in item && typeof item.id === "string" &&
    "createdAt" in item && typeof item.createdAt === "string" &&
    "action" in item && typeof item.action === "string" &&
    "description" in item && typeof item.description === "string"
  );
}

function loadEntries() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed: unknown = JSON.parse(saved);
    if (!isActivityLog(parsed)) throw new Error("Format log aktivitas demo tidak valid.");
    entries = parsed;
  } catch (error) {
    console.error("Log aktivitas demo tidak dapat dibaca.", error);
    entries = EMPTY_LOG;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getDemoActivityLogs() {
  loadEntries();
  return entries;
}

export function subscribeToDemoActivityLogs(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addDemoActivity(action: string, description: string) {
  loadEntries();
  const entry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    action,
    description,
  };
  entries = [entry, ...entries].slice(0, 100);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error("Log aktivitas hanya tersimpan selama halaman ini dibuka.", error);
    }
  }
  notify();
}
