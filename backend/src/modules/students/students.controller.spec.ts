import { Test, TestingModule } from '@nestjs/testing';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { AuthService } from '../auth/auth.service';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import type { SessionUser } from '../../common/types/session-user.type';

describe('StudentsController (Access Control - B2 & Blok 0)', () => {
  let controller: StudentsController;
  let mockStudentsService: any;

  beforeEach(async () => {
    mockStudentsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [
        {
          provide: StudentsService,
          useValue: mockStudentsService,
        },
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('Admin GET /students = 200 (mengembalikan daftar siswa)', async () => {
    const adminUser: SessionUser = {
      id: 'usr-admin',
      email: 'admin@smkn11jakarta.sch.id',
      nama: 'Admin Sekolah',
      role: Role.ADMIN,
      kelasId: null,
    };

    mockStudentsService.findAll.mockResolvedValueOnce({
      items: [{ id: 'std-1', nis: '241101', nama: 'Ahmad', kelasId: 'cls-1' }],
      total: 1,
      page: 1,
      limit: 20,
      nextCursor: null,
    });

    const result = await controller.findAll({}, adminUser);
    expect(result.items.length).toBe(1);
    expect(mockStudentsService.findAll).toHaveBeenCalledWith({}, null);
  });

  it('Ketua A GET students/:idKelasB = 403 (menolak akses siswa kelas lain)', async () => {
    const ketuaAUser: SessionUser = {
      id: 'usr-ketua-a',
      email: 'ketua.a@smkn11jakarta.sch.id',
      nama: 'Ketua A',
      role: Role.KETUA_KELAS,
      kelasId: 'cls-A',
    };

    mockStudentsService.findOne.mockResolvedValueOnce({
      id: 'std-in-b',
      nis: '251101',
      nama: 'Siswa Kelas B',
      kelasId: 'cls-B',
    });

    // Harus melempar ForbiddenException karena ketua kelas A mengakses siswa kelas B
    await expect((controller as any).findOne('std-in-b', ketuaAUser)).rejects.toThrow(ForbiddenException);
  });

  it('Ketua kelasId null GET students = 403 (menolak jika ketua kelas tidak memiliki kelasId)', async () => {
    const ketuaNullUser: SessionUser = {
      id: 'usr-ketua-null',
      email: 'ketua.null@smkn11jakarta.sch.id',
      nama: 'Ketua Tanpa Kelas',
      role: Role.KETUA_KELAS,
      kelasId: null,
    };

    // Harus melempar ForbiddenException karena ketua kelas tanpa kelasId tidak boleh melihat daftar siswa
    await expect(controller.findAll({}, ketuaNullUser)).rejects.toThrow(ForbiddenException);
  });
});
