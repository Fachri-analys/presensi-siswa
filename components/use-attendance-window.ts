"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getDemoAttendanceSchedule,
  getDemoAttendanceScheduleServerSnapshot,
  getJakartaMinutes,
  getOpenAttendanceSession,
  subscribeToDemoAttendanceSchedule,
  type AttendanceSessionId,
  type DemoAttendanceSchedule,
} from "@/lib/demo-schedule";

export function useAttendanceWindow(): {
  schedule: DemoAttendanceSchedule;
  activeSession: AttendanceSessionId | null;
  ready: boolean;
} {
  const schedule = useSyncExternalStore(
    subscribeToDemoAttendanceSchedule,
    getDemoAttendanceSchedule,
    getDemoAttendanceScheduleServerSnapshot,
  );
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return {
    schedule,
    activeSession: now === null ? null : getOpenAttendanceSession(schedule, getJakartaMinutes(new Date(now))),
    ready: now !== null,
  };
}
