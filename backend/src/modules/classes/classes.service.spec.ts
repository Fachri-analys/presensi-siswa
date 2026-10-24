import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { ActiveStatus, Role } from '@prisma/client';

describe('ClassesService (CRUD Kelas, Eager Loading)', () => {
  let service: ClassesService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      class: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  // [CRUD-05] Tambah kelas baru berhasil
  it('[CRUD-05] create() berhasil membuat kelas baru dengan nama unik', async () => {
    mockPrisma.class.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'cls-1',
        nama: 'XI PPLG 1',
        jurusan: 'PPLG',
        status: ActiveStatus.active,
        leader: null,
        _count: { students: 0 },
      });
    mockPrisma.class.create.mockResolvedValueOnce({
      id: 'cls-1',
      nama: 'XI PPLG 1',
      jurusan: 'PPLG',
      status: ActiveStatus.active,
    });

    const result = await service.create({
      nama: 'XI PPLG 1',
      jurusan: 'PPLG',
    });

    expect(result.nama).toBe('XI PPLG 1');
    expect(result.active).toBe(true);
    expect(result).toHaveProperty('ketuaAkunId');
    expect(mockPrisma.class.create).toHaveBeenCalled();
  });

  // [CRUD-06] Duplikasi nama kelas ditolak
  it('[CRUD-06] create() menolak jika nama kelas sudah ada', async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-existing', nama: 'XI PPLG 1' });

    await expect(
      service.create({ nama: 'XI PPLG 1', jurusan: 'PPLG' }),
    ).rejects.toThrow(ConflictException);
  });

  // [PERF-N1-02] Eager load ketua kelas dan jumlah siswa tanpa N+1 query
  it('[PERF-N1-02] findAll() menyertakan leader dan count siswa dalam query tunggal', async () => {
    mockPrisma.class.findMany.mockResolvedValueOnce([
      {
        id: 'cls-1',
        nama: 'XI PPLG 1',
        jurusan: 'PPLG',
        status: ActiveStatus.active,
        leader: { id: 'usr-1', nama: 'Aisyah Putri', email: 'aisyah@school.sch.id' },
        _count: { students: 30 },
      },
    ]);

    const result = await service.findAll({ id: 'usr-admin', email: 'admin@test.com', nama: 'Admin', role: Role.ADMIN, kelasId: null });
    expect(result.length).toBe(1);
    expect(result[0].ketuaNama).toBe('Aisyah Putri');
    expect(result[0].totalSiswa).toBe(30);

    const findManyArg = mockPrisma.class.findMany.mock.calls[0][0];
    expect(findManyArg.include.leader).toBeDefined();
    expect(findManyArg.include._count).toBeDefined();
  });

  // [CRUD-07] Tetapkan ketua kelas
  it('[CRUD-07] assignLeader() menetapkan user sebagai leader kelas', async () => {
    mockPrisma.class.findUnique
      .mockResolvedValueOnce({ id: 'cls-1', nama: 'XI PPLG 1' })
      .mockResolvedValueOnce({
        id: 'cls-1',
        nama: 'XI PPLG 1',
        jurusan: 'PPLG',
        status: ActiveStatus.active,
        leader: { id: 'usr-1', nama: 'Aisyah Putri', email: 'aisyah@test.com' },
        _count: { students: 25 },
      });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-1', nama: 'Aisyah Putri', role: Role.KETUA_KELAS, status: ActiveStatus.active, kelasId: null });
    mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'usr-1', kelasId: 'cls-1' });

    const result = await service.assignLeader('cls-1', 'usr-1');
    expect(result.ketuaAkunId).toBe('usr-1');
  });
});
