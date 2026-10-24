import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { ActiveStatus, Role } from '@prisma/client';

describe('UsersService (Account Management & Security)', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      session: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('[USER-01] create() berhasil membuat akun baru dan hash password', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: 'usr-1',
      email: 'guru@test.com',
      nama: 'Guru Piket 1',
      role: Role.GURU_PIKET,
      status: ActiveStatus.active,
      kelasId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      nama: 'Guru Piket 1',
      email: 'guru@test.com',
      role: Role.GURU_PIKET,
      password: 'SecurePassword123!',
    });

    expect(result.email).toBe('guru@test.com');
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('[USER-02] create() menolak duplikasi email dengan ConflictException', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-existing', email: 'guru@test.com' });

    await expect(
      service.create({
        nama: 'Guru Duplikat',
        email: 'guru@test.com',
        role: Role.GURU_PIKET,
        password: 'SecurePassword123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('[USER-03] findAll() mengembalikan daftar akun dengan pagination', async () => {
    const mockUsers = [
      { id: 'usr-1', email: 'admin@test.com', nama: 'Admin', role: Role.ADMIN, status: ActiveStatus.active },
      { id: 'usr-2', email: 'guru@test.com', nama: 'Guru', role: Role.GURU_PIKET, status: ActiveStatus.active },
    ];
    mockPrisma.user.findMany.mockResolvedValueOnce(mockUsers);
    mockPrisma.user.count.mockResolvedValueOnce(2);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it('[USER-04] update() menolak perubahan jika email konflik dengan akun lain', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-1', email: 'admin@test.com' });
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'usr-2', email: 'existing@test.com' });

    await expect(
      service.update('usr-1', { email: 'existing@test.com' }),
    ).rejects.toThrow(ConflictException);
  });

});
