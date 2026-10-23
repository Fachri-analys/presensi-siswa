import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QueryAttendanceDto, QueryHistoryDto, QueryRecapDto } from './dto/query-attendance.dto';
import { ActiveStatus, AttendanceSession, AttendanceStatus, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import { parseDateOnly, nowWibTime } from '../../common/utils/time.util';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async saveBatch(dto: BatchAttendanceDto, user: SessionUser) {
    // 1. Proteksi IDOR / BOLA: Ketua Kelas HANYA boleh mengisi kelasnya sendiri
    if (user.role === Role.KETUA_KELAS) {
      if (!user.kelasId || user.kelasId !== dto.kelasId) {
        throw new ForbiddenException(
          'Ketua Kelas hanya diizinkan mencatat presensi untuk kelas yang ditugaskan kepadanya.',
        );
      }
    }

    const attendanceDate = parseDateOnly(dto.date);

    // 2. Enforcement jadwal sesi untuk Ketua Kelas (B3: FR-ATT-12)
    //    HADIR/TERLAMBAT hanya boleh dicatat dalam window sesi terbuka.
    //    IZIN/SAKIT/ALPA selalu diizinkan.
    if (user.role === Role.KETUA_KELAS) {
      const hasPresent = dto.records.some(
        (r) => r.status === AttendanceStatus.HADIR || r.status === AttendanceStatus.TERLAMBAT,
      );

      if (hasPresent) {
        const schedules = await this.prisma.schedule.findMany();
        const currentTime = nowWibTime();

        // Cek apakah ada sesi yang window-nya terbuka dan tidak terkunci
        const openSession = schedules.find(
          (s) => !s.terkunci && currentTime >= s.mulai && currentTime <= s.selesai,
        );

        if (!openSession) {
          // Cek izin khusus (permission) per kelas/tanggal
          const permission = await this.prisma.attendancePermission.findFirst({
            where: {
              date: attendanceDate,
              kelasId: dto.kelasId,
              usedAt: null,
            },
          });
          if (!permission) {
            throw new ForbiddenException(
              'Sesi presensi saat ini tidak aktif atau terkunci. ' +
              'Ketua Kelas hanya dapat mencatat HADIR/TERLAMBAT dalam window sesi terbuka. ' +
              'Hubungi Guru Piket untuk membuka izin presensi.',
            );
          }
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

    const attendanceDate = parseDateOnly(query.date);

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

    const fromDate = parseDateOnly(query.from);
    const toDate = parseDateOnly(query.to);

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
          entry.hadir += count;
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
      include: {
        leader: { select: { id: true } },
      },
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
    if (query.from) dateFilter.gte = parseDateOnly(query.from);
    if (query.to) dateFilter.lte = parseDateOnly(query.to);

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
      const hadir = stat.hadir + stat.terlambat;
      const persentase = effectiveDays > 0 ? Math.round((hadir / effectiveDays) * 100) : 0;

      return {
        id: st.id,
        nis: st.nis,
        nama: st.nama,
        hadir,
        terlambat: stat.terlambat,
        izin: stat.izin,
        sakit: stat.sakit,
        alpa: stat.alpa,
        persentase,
      };
    });

    const from = query.from ?? (distinctDates.length > 0 ? distinctDates[0].date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const to = query.to ?? (distinctDates.length > 0 ? distinctDates[distinctDates.length - 1].date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));

    return {
      kelas: {
        id: kelas.id,
        nama: kelas.nama,
        jurusan: kelas.jurusan,
        active: kelas.status === ActiveStatus.active,
        ketuaAkunId: kelas.leader?.id ?? null,
      },
      from,
      to,
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
