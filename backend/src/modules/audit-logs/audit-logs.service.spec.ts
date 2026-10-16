import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditResult, Role } from '@prisma/client';

describe('AuditLogsService (Audit Trail & Eager Loading)', () => {
  let service: AuditLogsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('[AUDIT-01] findAll() mengambil log aktivitas dengan eager loading actor (cegah N+1)', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        action: 'Presensi disimpan',
        objectType: 'Attendance',
        objectId: 'att-1',
        result: AuditResult.SUCCESS,
        metadata: { kelasId: 'cls-1' },
        createdAt: new Date(),
        actor: {
          id: 'usr-1',
          nama: 'Admin Sekolah',
          role: Role.ADMIN,
          email: 'admin@sekolah.sch.id',
        },
      },
    ];

    mockPrisma.auditLog.findMany.mockResolvedValueOnce(mockLogs);
    mockPrisma.auditLog.count.mockResolvedValueOnce(1);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].actor?.nama).toBe('Admin Sekolah');
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          actor: expect.any(Object),
        }),
      }),
    );
  });
});
