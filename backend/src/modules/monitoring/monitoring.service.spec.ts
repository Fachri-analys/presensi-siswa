import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

describe('MonitoringService (Single Aggregation, N+1 Prevention)', () => {
  let service: MonitoringService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      class: {
        findMany: jest.fn(),
      },
      attendance: {
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  // [PERF-N1-04] Monitoring seluruh kelas hanya menggunakan 2 query database (O(1))
  it('[PERF-N1-04] getSummary() menggunakan tepat 2 query database untuk seluruh kelas', async () => {
    mockPrisma.class.findMany.mockResolvedValueOnce([
      { id: 'cls-1', nama: 'XI PPLG 1', jurusan: 'PPLG', _count: { students: 30 } },
      { id: 'cls-2', nama: 'X PPLG 1', jurusan: 'PPLG', _count: { students: 25 } },
    ]);

    mockPrisma.attendance.groupBy.mockResolvedValueOnce([
      { kelasId: 'cls-1', status: AttendanceStatus.HADIR, _count: { status: 28 } },
      { kelasId: 'cls-1', status: AttendanceStatus.SAKIT, _count: { status: 2 } },
      { kelasId: 'cls-2', status: AttendanceStatus.HADIR, _count: { status: 25 } },
    ]);

    const result = await service.getSummary('2026-10-16');

    expect(result.length).toBe(2);
    expect(result[0].hadir).toBe(28);
    expect(result[0].sakit).toBe(2);
    expect(result[1].hadir).toBe(25);

    // Verifikasi query complexity: tepat 1 class.findMany dan 1 attendance.groupBy
    expect(mockPrisma.class.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.attendance.groupBy).toHaveBeenCalledTimes(1);
  });
});
