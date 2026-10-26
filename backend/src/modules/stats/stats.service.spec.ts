import { Role } from '@prisma/client';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StatsService date boundaries', () => {
  afterEach(() => jest.useRealTimers());

  it('uses the Jakarta calendar date for default ranges', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-31T18:00:00.000Z'));
    const groupBy = jest.fn().mockResolvedValue([]);
    const service = new StatsService({ attendance: { groupBy } } as unknown as PrismaService);

    await service.attendanceTrend({}, { id: 'admin-1', role: Role.ADMIN, kelasId: null } as never);

    expect(groupBy.mock.calls[0][0].where.date).toEqual({
      gte: new Date('2026-11-01T00:00:00.000Z'),
      lte: new Date('2026-11-01T00:00:00.000Z'),
    });
  });

  it('rejects statistical ranges longer than one year', async () => {
    const service = new StatsService({ attendance: { groupBy: jest.fn() } } as unknown as PrismaService);

    await expect(service.classComparison(
      { from: '2025-01-01', to: '2026-12-31' },
      { id: 'admin-1', role: Role.ADMIN, kelasId: null } as never,
    )).rejects.toThrow('Rentang maksimal 366 hari.');
  });
});
