import { BadRequestException } from '@nestjs/common';

const WIB_TIMEZONE = 'Asia/Jakarta';

const wibFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WIB_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu Asia/Jakarta (WIB).
 */
export function todayWib(now = new Date()): string {
  return wibFormatter.format(now);
}

/**
 * Memvalidasi dan mem-parse string tanggal yang HANYA berformat YYYY-MM-DD
 * ke objek Date pada UTC midnight (untuk field @db.Date Prisma).
 */
export function parseDateOnly(dateStr: string): Date {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new BadRequestException(`Format tanggal "${dateStr}" harus YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const date = new Date(Date.UTC(year, month - 1, day));

  // Validasi nilai kalender nyata (misal menolak 2026-02-31)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException(`Tanggal "${dateStr}" tidak valid dalam kalender.`);
  }

  return date;
}

const wibTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Mengembalikan jam saat ini dalam format HH:MM sesuai zona waktu Asia/Jakarta (WIB).
 */
export function nowWibTime(now = new Date()): string {
  return wibTimeFormatter.format(now);
}
