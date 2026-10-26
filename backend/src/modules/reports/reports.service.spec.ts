import { ActiveStatus, Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ReportsService', () => {
  it('aggregates class attendance by student and status in the database', async () => {
    const students = [
      { id: 'student-1', nis: '001', nama: 'Siswa Aktif', status: ActiveStatus.active },
      { id: 'student-2', nis: '002', nama: 'Siswa Nonaktif', status: ActiveStatus.inactive },
    ];
    const attendanceGroups = [
      { studentId: 'student-1', status: 'HADIR', _count: { status: 2 } },
      { studentId: 'student-1', status: 'TERLAMBAT', _count: { status: 1 } },
      { studentId: 'student-2', status: 'SAKIT', _count: { status: 1 } },
    ];
    const prisma = {
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
      class: { findUnique: jest.fn().mockResolvedValue({ id: 'class-1', nama: 'X-A', jurusan: 'RPL' }) },
      student: { findMany: jest.fn().mockResolvedValue(students) },
      attendance: { groupBy: jest.fn().mockResolvedValue(attendanceGroups) },
    };
    const service = new ReportsService(
      prisma as unknown as PrismaService,
      {} as AuditLogsService,
    );

    const report = await service.attendance(
      { kelasId: 'class-1', from: '2026-10-01', to: '2026-10-02' },
      { id: 'admin-1', role: Role.ADMIN, kelasId: null } as never,
    );

    expect(prisma.attendance.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['studentId', 'status'],
      _count: { status: true },
      where: expect.objectContaining({ kelasId: 'class-1' }),
    }));
    expect(report.rows).toEqual([
      expect.objectContaining({ nis: '001', hadir: 3, terlambat: 1 }),
      expect.objectContaining({ nis: '002', sakit: 1 }),
    ]);
  });
});
