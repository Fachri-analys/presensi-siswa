import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QueryAttendanceDto, QueryHistoryDto, QueryRecapDto } from './dto/query-attendance.dto';
import { ActiveStatus, AttendanceStatus, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import { parseDateOnly, nowWibTime } from '../../common/utils/time.util';
import { assertClassAccess } from '../../common/utils/access-control.util';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateAttendancePermissionDto } from './dto/create-attendance-permission.dto';

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
    const kelas = await this.prisma.class.findUnique({ where: { id: dto.kelasId }, select: { status: true } });
    if (!kelas || kelas.status !== ActiveStatus.active) {
      throw new NotFoundException('Kelas aktif tidak ditemukan.');
    }
    const markedAt = nowWibTime();

    let presentWindowOpen = true;
    if (user.role === Role.KETUA_KELAS) {
      const hasPresent = dto.records.some(
        (r) => r.status === AttendanceStatus.HADIR || r.status === AttendanceStatus.TERLAMBAT,
      );

      if (hasPresent) {
        const schedules = await this.prisma.schedule.findMany();
        // Cek apakah ada sesi yang window-nya terbuka dan tidak terkunci
        const openSession = schedules.find(
          (s) => !s.terkunci && markedAt >= s.mulai && markedAt < s.selesai,
        );
        presentWindowOpen = Boolean(openSession);
      }
    }

    // 3. Eager load siswa di kelas untuk memetakan NIS -> studentId (1 query, cegah N+1)
    const students = await this.prisma.student.findMany({
      where: { kelasId: dto.kelasId, status: ActiveStatus.active },
      select: { id: true, nis: true },
    });
    const studentMap = new Map(students.map((s) => [s.nis, s.id]));
    const nisValues = dto.records.map((record) => record.nis);
    if (new Set(nisValues).size !== nisValues.length) {
      throw new BadRequestException('Setiap siswa hanya boleh muncul satu kali dalam satu batch.');
    }
    if (nisValues.some((nis) => !studentMap.has(nis))) {
      throw new BadRequestException('Batch memuat siswa yang tidak aktif atau bukan anggota kelas tersebut.');
    }

    // 4. Batch Transaksi Database atomik untuk mencegah race condition & data inconsistent
    const results = await this.prisma.$transaction(async (tx) => {
      const savedList = [];

      for (const rec of dto.records) {
        const studentId = studentMap.get(rec.nis);
        if (!studentId) throw new BadRequestException('Siswa tidak ditemukan pada kelas tersebut.');

        if (
          user.role === Role.KETUA_KELAS &&
          !presentWindowOpen &&
          (rec.status === AttendanceStatus.HADIR || rec.status === AttendanceStatus.TERLAMBAT)
        ) {
          const permission = await tx.attendancePermission.findFirst({
            where: { date: attendanceDate, kelasId: dto.kelasId, studentId, usedAt: null },
          });
          if (!permission) {
            throw new ForbiddenException('Izin Guru Piket untuk siswa ini tidak tersedia atau sudah digunakan.');
          }
          const consumed = await tx.attendancePermission.updateMany({
            where: { id: permission.id, usedAt: null },
            data: { usedAt: new Date(), usedById: user.id },
          });
          if (consumed.count !== 1) {
            throw new ForbiddenException('Izin Guru Piket untuk siswa ini sudah digunakan.');
          }
        }

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
          waktu: rec.status === AttendanceStatus.HADIR || rec.status === AttendanceStatus.TERLAMBAT
            ? (user.role === Role.KETUA_KELAS ? markedAt : rec.waktu ?? null)
            : null,
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

  async grantPresentPermission(dto: CreateAttendancePermissionDto, user: SessionUser) {
    const date = parseDateOnly(dto.date);
    const kelas = await this.prisma.class.findUnique({
      where: { id: dto.kelasId },
      select: { id: true, status: true },
    });
    if (!kelas || kelas.status !== ActiveStatus.active) {
      throw new NotFoundException('Kelas aktif tidak ditemukan.');
    }

    const student = await this.prisma.student.findFirst({
      where: { nis: dto.nis, kelasId: dto.kelasId, status: ActiveStatus.active },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Siswa aktif tidak ditemukan pada kelas tersebut.');

    const existing = await this.prisma.attendancePermission.findUnique({
      where: { date_kelasId_studentId: { date, kelasId: dto.kelasId, studentId: student.id } },
    });
    if (existing) throw new ConflictException('Izin satu kali untuk siswa ini sudah pernah diberikan.');

    return this.prisma.$transaction(async (tx) => {
      const permission = await tx.attendancePermission.create({
        data: { date, kelasId: dto.kelasId, studentId: student.id, grantedById: user.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ATTENDANCE_PERMISSION_GRANTED',
          objectType: 'ATTENDANCE_PERMISSION',
          objectId: permission.id,
          result: 'SUCCESS',
          metadata: { date: dto.date, kelasId: dto.kelasId, nis: dto.nis },
        },
      });
      return permission;
    });
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto, user: SessionUser) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { student: { select: { nis: true, nama: true } } },
    });
    if (!attendance) throw new NotFoundException('Catatan presensi tidak ditemukan.');
    assertClassAccess(user, attendance.kelasId);

    const needsPermission =
      user.role === Role.KETUA_KELAS &&
      attendance.status !== AttendanceStatus.HADIR &&
      attendance.status !== AttendanceStatus.TERLAMBAT &&
      (dto.status === AttendanceStatus.HADIR || dto.status === AttendanceStatus.TERLAMBAT);
    let presentWindowOpen = true;
    if (needsPermission) {
      const currentTime = nowWibTime();
      const schedules = await this.prisma.schedule.findMany();
      presentWindowOpen = schedules.some(
        (schedule) => !schedule.terkunci && currentTime >= schedule.mulai && currentTime < schedule.selesai,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (needsPermission && !presentWindowOpen) {
        const permission = await tx.attendancePermission.findFirst({
          where: {
            date: attendance.date,
            kelasId: attendance.kelasId,
            studentId: attendance.studentId,
            usedAt: null,
          },
        });
        if (!permission) throw new ForbiddenException('Izin Guru Piket untuk siswa ini tidak tersedia atau sudah digunakan.');
        const consumed = await tx.attendancePermission.updateMany({
          where: { id: permission.id, usedAt: null },
          data: { usedAt: new Date(), usedById: user.id },
        });
        if (consumed.count !== 1) throw new ForbiddenException('Izin Guru Piket untuk siswa ini sudah digunakan.');
      }

      const updated = await tx.attendance.update({
        where: { id },
        data: {
          status: dto.status,
          waktu: dto.status === AttendanceStatus.HADIR || dto.status === AttendanceStatus.TERLAMBAT
            ? (user.role === Role.KETUA_KELAS ? nowWibTime() : dto.waktu === undefined ? attendance.waktu : dto.waktu)
            : null,
          keterangan: dto.keterangan ?? '',
          updatedById: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ATTENDANCE_UPDATED',
          objectType: 'ATTENDANCE',
          objectId: id,
          result: 'SUCCESS',
          metadata: {
            date: attendance.date.toISOString().slice(0, 10),
            kelasId: attendance.kelasId,
            nis: attendance.student.nis,
            fromStatus: attendance.status,
            toStatus: updated.status,
          },
        },
      });

      return {
        id: updated.id,
        date: updated.date.toISOString().slice(0, 10),
        kelasId: updated.kelasId,
        nis: attendance.student.nis,
        nama: attendance.student.nama,
        status: updated.status,
        waktu: updated.waktu,
        keterangan: updated.keterangan,
        createdBy: updated.createdById,
        updatedBy: updated.updatedById,
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async deleteAttendance(id: string, user: SessionUser) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: { student: { select: { nis: true, nama: true } } },
    });

    if (!attendance) {
      throw new NotFoundException(`Catatan presensi dengan ID "${id}" tidak ditemukan.`);
    }

    assertClassAccess(user, attendance.kelasId);

    await this.prisma.$transaction(async (tx) => {
      await tx.attendance.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'ATTENDANCE_DELETED',
          objectType: 'ATTENDANCE',
          objectId: id,
          result: 'SUCCESS',
          metadata: {
            date: attendance.date.toISOString().slice(0, 10),
            kelasId: attendance.kelasId,
            nis: attendance.student.nis,
            nama: attendance.student.nama,
            status: attendance.status,
          },
        },
      });
    });
  }
}
