import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QueryAttendanceDto, QueryHistoryDto, QueryRecapDto } from './dto/query-attendance.dto';
import { AttendanceSession, AttendanceStatus, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(dateStr: string): Date {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Format tanggal "${dateStr}" tidak valid.`);
    }
    // Set ke UTC midnight untuk kolom @db.Date
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async saveBatch(dto: BatchAttendanceDto, user: SessionUser) {
    // 1. Proteksi IDOR / BOLA: Ketua Kelas HANYA boleh mengisi kelasnya sendiri
    if (user.role === Role.KETUA_KELAS) {
      if (!user.kelasId || user.kelasId !== dto.kelasId) {
        throw new ForbiddenException(
          'Ketua Kelas hanya diizinkan mencatat presensi untuk kelas yang ditugaskan kepadanya.',
        );
      }
    }

    const attendanceDate = this.parseDate(dto.date);

    // 2. Periksa jadwal penguncian sesi jika bukan Admin / Guru Piket
    if (user.role === Role.KETUA_KELAS) {
      const schedule = await this.prisma.schedule.findFirst({
        where: { session: AttendanceSession.PAGI },
      });
      if (schedule?.terkunci) {
        // Cek izin khusus (permission)
        const permission = await this.prisma.attendancePermission.findFirst({
          where: {
            date: attendanceDate,
            kelasId: dto.kelasId,
            usedAt: null,
          },
        });
        if (!permission) {
          throw new ForbiddenException(
            'Sesi presensi saat ini terkunci. Hubungi Guru Piket untuk membuka izin presensi.',
          );
        }
      }
    }

    // 3. Eager load siswa di kelas untuk memetakan NIS -> studentId (1 query, cegah N+1)
    const students = await this.prisma.student.findMany({
      where: { kelasId: dto.kelasId },
      select: { id: true, nis: true },
    });
    const studentMap = new Map(students.map((s) => [s.nis, s.id]));

    // 4. Batch Transaksi Database atomik untuk mencegah race condition & data inconsistent
    const results = await this.prisma.$transaction(async (tx) => {
      const savedList = [];

      for (const rec of dto.records) {
        const studentId = studentMap.get(rec.nis);
        if (!studentId) continue;

        const saved = await tx.attendance.upsert({
          where: {
            date_kelasId_studentId: {
              date: attendanceDate,
              kelasId: dto.kelasId,
              studentId,
            },
          },
          create: {
            date: attendanceDate,
            kelasId: dto.kelasId,
            studentId,
            status: rec.status,
            waktu: rec.waktu ?? null,
            keterangan: rec.keterangan ?? '',
            createdById: user.id,
            updatedById: user.id,
          },
          update: {
            status: rec.status,
            waktu: rec.waktu ?? null,
            keterangan: rec.keterangan ?? '',
            updatedById: user.id,
          },
          include: {
            student: { select: { nis: true, nama: true } },
          },
        });

        savedList.push(saved);
      }

      // Catat audit log aktivitas
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'BATCH_ATTENDANCE_SAVED',
          objectType: 'ATTENDANCE',
          objectId: dto.kelasId,
          result: 'SUCCESS',
          metadata: {
            date: dto.date,
            kelasId: dto.kelasId,
            totalRecords: dto.records.length,
          },
        },
      });

      return savedList;
    });

    return results.map((r) => ({
      id: r.id,
      date: dto.date,
      kelasId: r.kelasId,
      nis: r.student.nis,
      nama: r.student.nama,
      status: r.status,
      waktu: r.waktu,
      keterangan: r.keterangan,
      createdBy: r.createdById,
      updatedBy: r.updatedById,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async findByClassAndDate(query: QueryAttendanceDto, user: SessionUser) {
    if (user.role === Role.KETUA_KELAS && user.kelasId !== query.kelasId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke kelas ini.');
    }

    const attendanceDate = this.parseDate(query.date);

    // Eager loading student untuk mencegah N+1 query
    const attendances = await this.prisma.attendance.findMany({
      where: {
        kelasId: query.kelasId,
        date: attendanceDate,
      },
      include: {
        student: { select: { nis: true, nama: true } },
      },
      orderBy: { student: { nis: 'asc' } },
    });

    return attendances.map((a) => ({
      id: a.id,
      date: query.date,
      kelasId: a.kelasId,
      nis: a.student.nis,
      nama: a.student.nama,
      status: a.status,
      waktu: a.waktu,
      keterangan: a.keterangan,
      createdBy: a.createdById,
      updatedBy: a.updatedById,
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  async getHistory(query: QueryHistoryDto, user: SessionUser) {
    if (user.role === Role.KETUA_KELAS && user.kelasId !== query.kelasId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const fromDate = this.parseDate(query.from);
    const toDate = this.parseDate(query.to);

    // Agregasi grup by tanggal dan status (Hanya 1 query, O(1) query complexity)
    const rawCounts = await this.prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: {
        kelasId: query.kelasId,
        date: { gte: fromDate, lte: toDate },
      },
      _count: { status: true },
    });

    // Petakan ke format HistoryRow per tanggal
    const map = new Map<
      string,
      {
        date: string;
        hadir: number;
        izin: number;
        sakit: number;
        alpa: number;
        terlambat: number;
      }
    >();

    for (const item of rawCounts) {
      const dStr = item.date.toISOString().slice(0, 10);
      if (!map.has(dStr)) {
        map.set(dStr, {
          date: dStr,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
          terlambat: 0,
        });
      }
      const entry = map.get(dStr)!;
      const count = item._count.status;
      switch (item.status) {
        case AttendanceStatus.HADIR:
          entry.hadir += count;
          break;
        case AttendanceStatus.TERLAMBAT:
          entry.terlambat += count;
          break;
        case AttendanceStatus.IZIN:
          entry.izin += count;
          break;
        case AttendanceStatus.SAKIT:
          entry.sakit += count;
          break;
        case AttendanceStatus.ALPA:
          entry.alpa += count;
          break;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  async getRecap(query: QueryRecapDto, user: SessionUser) {
    if (user.role === Role.KETUA_KELAS && user.kelasId !== query.kelasId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const kelas = await this.prisma.class.findUnique({
      where: { id: query.kelasId },
    });
    if (!kelas) {
      throw new NotFoundException('Kelas tidak ditemukan.');
    }

    // 1. Ambil seluruh siswa kelas ini (Query 1)
    const students = await this.prisma.student.findMany({
      where: { kelasId: query.kelasId },
      orderBy: { nis: 'asc' },
    });

    // 2. Agregasi status presensi per siswa menggunakan groupBy (Query 2 - Mencegah N+1)
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.from) dateFilter.gte = this.parseDate(query.from);
    if (query.to) dateFilter.lte = this.parseDate(query.to);

    const counts = await this.prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: {
        kelasId: query.kelasId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      _count: { status: true },
    });

    // Hitung tanggal unik presensi sebagai effectiveDays
    const distinctDates = await this.prisma.attendance.findMany({
      where: {
        kelasId: query.kelasId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      distinct: ['date'],
      select: { date: true },
    });
    const effectiveDays = distinctDates.length;

    const studentStats = new Map<
      string,
      { hadir: number; izin: number; sakit: number; alpa: number; terlambat: number }
    >();

    for (const c of counts) {
      if (!studentStats.has(c.studentId)) {
        studentStats.set(c.studentId, { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 });
      }
      const s = studentStats.get(c.studentId)!;
      const count = c._count.status;
      switch (c.status) {
        case AttendanceStatus.HADIR:
          s.hadir += count;
          break;
        case AttendanceStatus.TERLAMBAT:
          s.terlambat += count;
          break;
        case AttendanceStatus.IZIN:
          s.izin += count;
          break;
        case AttendanceStatus.SAKIT:
          s.sakit += count;
          break;
        case AttendanceStatus.ALPA:
          s.alpa += count;
          break;
      }
    }

    const rows = students.map((st) => {
      const stat = studentStats.get(st.id) ?? { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0 };
      const totalHadir = stat.hadir + stat.terlambat;
      const persentase = effectiveDays > 0 ? Math.round((totalHadir / effectiveDays) * 100) : 0;

      return {
        id: st.id,
        nis: st.nis,
        nama: st.nama,
        hadir: stat.hadir,
        terlambat: stat.terlambat,
        izin: stat.izin,
        sakit: stat.sakit,
        alpa: stat.alpa,
        persentase,
      };
    });

    return {
      kelas: {
        id: kelas.id,
        nama: kelas.nama,
        jurusan: kelas.jurusan,
      },
      effectiveDays,
      rows,
    };
  }

  async getSchedules() {
    return this.prisma.schedule.findMany({
      orderBy: { session: 'asc' },
    });
  }

  async updateSchedule(
    session: AttendanceSession,
    dto: { mulai?: string; selesai?: string; terkunci?: boolean },
    user: SessionUser,
  ) {
    return this.prisma.schedule.upsert({
      where: { session },
      create: {
        session,
        mulai: dto.mulai ?? '07:00',
        selesai: dto.selesai ?? '12:00',
        terkunci: dto.terkunci ?? false,
        updatedById: user.id,
      },
      update: {
        ...(dto.mulai ? { mulai: dto.mulai } : {}),
        ...(dto.selesai ? { selesai: dto.selesai } : {}),
        ...(dto.terkunci !== undefined ? { terkunci: dto.terkunci } : {}),
        updatedById: user.id,
      },
    });
  }
}
