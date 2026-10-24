"use client";

import { useEffect, useState } from "react";
import { createApiScheduleRepository } from "@/lib/data/api-schedules";

type Session = "pagi" | "siang";
type Schedule = { mulai: string; selesai: string; terkunci: boolean };
type DailySchedule = Record<Session, Schedule>;

function jakartaMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: "hour" | "minute") => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export function useAttendanceWindow(): { schedule: DailySchedule | null; activeSession: Session | null; ready: boolean } {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const repo = createApiScheduleRepository();
    if (!repo) return;
    void repo.listSchedules().then((items) => {
      const daily: Partial<DailySchedule> = {};
      for (const item of items) daily[item.session === "PAGI" ? "pagi" : "siang"] = { mulai: item.mulai, selesai: item.selesai, terkunci: item.terkunci };
      if (daily.pagi && daily.siang) setSchedule(daily as DailySchedule);
    }).catch(() => setSchedule(null));
  }, []);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update(); const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  let activeSession: Session | null = null;
  if (schedule && now !== null) {
    const minutes = jakartaMinutes(new Date(now));
    for (const session of ["pagi", "siang"] as const) {
      const { mulai, selesai, terkunci } = schedule[session];
      const start = Number(mulai.slice(0, 2)) * 60 + Number(mulai.slice(3));
      const end = Number(selesai.slice(0, 2)) * 60 + Number(selesai.slice(3));
      if (!terkunci && minutes >= start && minutes < end) activeSession = session;
    }
  }
  return { schedule, activeSession, ready: now !== null && schedule !== null };
}
