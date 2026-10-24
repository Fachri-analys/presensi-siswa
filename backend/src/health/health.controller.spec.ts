import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('health() mengembalikan status ok dan timestamp ISO', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });

  it('db() mengembalikan status connected jika query berhasil', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const result = await controller.db();
    expect(result).toEqual({ status: 'ok', database: 'connected' });
  });

  it('db() mengembalikan status disconnected jika database gagal', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB unreachable'));
    await expect(controller.db()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
