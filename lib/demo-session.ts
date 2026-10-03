"use client";

import type { Role } from "./types";

const STORAGE_KEY = "presensi-role";
const SESSION_EVENT = "presensi-demo-session-change";
const ROLES: Role[] = ["KETUA_KELAS", "GURU_PIKET", "ADMIN"];

function isRole(value: string | null): value is Role {
  return value !== null && ROLES.some((role) => role === value);
}

export function getDemoSessionRole(): Role | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  return isRole(value) ? value : null;
}

export function setDemoSessionRole(role: Role) {
  window.sessionStorage.setItem(STORAGE_KEY, role);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearDemoSession() {
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToDemoSession(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function getDemoSessionServerSnapshot(): null {
  return null;
}
