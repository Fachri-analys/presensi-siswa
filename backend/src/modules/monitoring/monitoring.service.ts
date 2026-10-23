import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActiveStatus, AttendanceStatus } from '@prisma/client';
import { parseDateOnly } from '../../common/utils/time.util';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(dateStr: string) {
    const attendanceDate = parseDateOnly(dateStr);

    // 1. Ambil seluruh kelas aktif beserta jumlah siswa aktif (Query 1)
    const classes = await this.prisma.class.findMany({
      where: { status: ActiveStatus.active },
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        jurusan: true,
        _count: {
          select: {
            students: { where: { status: ActiveStatus.active } },
          },
        },
      },
    });

    // 2. Agregasi seluruh presensi hari ini dikelompokkan berdasarkan kelas & status (Query 2 - Mencegah N+1)
    const attendanceStats = await this.prisma.attendance.groupBy({
      by: ['kelasId', 'status'],
      where: {
        date: attendanceDate,
      },
      _count: { status: true },
    });

    // Petakan ke Map (O(N) in memory processing)
    const statMap = new Map<
      string,
      { hadir: number; izin: number; sakit: number; alpa: number; terlambat: number }
    >();

    for (const stat of attendanceStats) {
      if (!statMap.has(stat.kelasId)) {
        statMap.set(stat.kelasId, {
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
          terlambat: 0,
        });
      }
      const entry = statMap.get(stat.kelasId)!;
      const count = stat._count.status;
      switch (stat.status) {
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

    return classes.map((c) => {
      const stats = statMap.get(c.id) ?? {
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
      };
      return {
        id: c.id,
        nama: c.nama,
        jurusan: c.jurusan,
        siswa: c._count.students,
        ...stats,
      };
    });
  }
}
