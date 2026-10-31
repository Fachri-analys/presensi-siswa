import { Test, TestingModule } from '@nestjs/testing';
import { StudentsService } from './students.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SickLettersService } from '../sick-letters/sick-letters.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ActiveStatus } from '@prisma/client';

describe('StudentsService (CRUD, IDOR, N+1)', () => {
  let service: StudentsService;
  let mockPrisma: any;
  let mockSickLetters: { removeFiles: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      student: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      class: {
        findUnique: jest.fn(),
      },
      sickLetter: {
        findMany: jest.fn(),
      },
    };
    mockSickLetters = { removeFiles: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SickLettersService, useValue: mockSickLetters },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  // [CRUD-01] Tambah siswa baru dengan NIS unik berhasil
  it('[CRUD-01] create() berhasil menambahkan siswa jika kelas ada dan NIS unik', async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-1', nama: 'XI PPLG 1', status: ActiveStatus.active });
    mockPrisma.student.findUnique.mockResolvedValueOnce(null);
    mockPrisma.student.create.mockResolvedValueOnce({
      id: 'std-1',
      nis: '241101',
      nama: 'Ahmad Fauzi',
      kelasId: 'cls-1',
      status: ActiveStatus.active,
      kelas: { nama: 'XI PPLG 1' },
    });

    const result = await service.create({
      nis: '241101',
      nama: 'Ahmad Fauzi',
      kelasId: 'cls-1',
    });

    expect(result.nis).toBe('241101');
    expect(mockPrisma.student.create).toHaveBeenCalled();
  });

  // [CRUD-02] Duplikasi NIS ditolak dengan ConflictException
  it('[CRUD-02] create() menolak jika NIS sudah ada', async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-1' });
    mockPrisma.student.findUnique.mockResolvedValueOnce({ id: 'std-existing', nis: '241101' });

    await expect(
      service.create({ nis: '241101', nama: 'Ahmad', kelasId: 'cls-1' }),
    ).rejects.toThrow(ConflictException);
  });

  // [CRUD-03] Tambah siswa pada kelas yang tidak ada ditolak NotFoundException
  it('[CRUD-03] create() menolak jika kelasId tidak ditemukan di database', async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.create({ nis: '241102', nama: 'Budi', kelasId: 'cls-non-existent' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('[CRUD-05] create() menolak kelas nonaktif', async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-1', status: ActiveStatus.inactive });

    await expect(service.create({ nis: '241103', nama: 'Citra', kelasId: 'cls-1' }))
      .rejects.toThrow(ConflictException);
    expect(mockPrisma.student.create).not.toHaveBeenCalled();
  });

  // [CRUD-04] Update data siswa berhasil
  it('[CRUD-04] update() berhasil memperbarui data siswa', async () => {
    mockPrisma.student.findUnique
      .mockResolvedValueOnce({ id: 'std-1', nis: '241101' }) // findOne
      .mockResolvedValueOnce(null); // existing check
    mockPrisma.student.update.mockResolvedValueOnce({
      id: 'std-1',
      nis: '241101',
      nama: 'Ahmad Fauzi Updated',
      status: ActiveStatus.active,
    });

    const result = await service.update('std-1', { nama: 'Ahmad Fauzi Updated' });
    expect(result.nama).toBe('Ahmad Fauzi Updated');
  });

  it('[CRUD-06] update() menolak memindahkan siswa ke kelas nonaktif', async () => {
    mockPrisma.student.findUnique.mockResolvedValueOnce({ id: 'std-1', nis: '241101', kelasId: 'cls-old' });
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-new', status: ActiveStatus.inactive });

    await expect(service.update('std-1', { kelasId: 'cls-new' })).rejects.toThrow(ConflictException);
    expect(mockPrisma.student.update).not.toHaveBeenCalled();
  });

  it('[CRUD-07] update() mempertahankan siswa pada kelas nonaktif yang sama', async () => {
    mockPrisma.student.findUnique.mockResolvedValueOnce({ id: 'std-1', nis: '241101', kelasId: 'cls-old' });
    mockPrisma.class.findUnique.mockResolvedValueOnce({ id: 'cls-old', status: ActiveStatus.inactive });
    mockPrisma.student.update.mockResolvedValueOnce({ id: 'std-1', nama: 'Siswa diperbarui' });

    await expect(service.update('std-1', { kelasId: 'cls-old' })).resolves.toBeDefined();
  });

  it('[PRIVACY-01] remove() menghapus file surat sakit setelah siswa berhasil dihapus', async () => {
    mockPrisma.student.findUnique.mockResolvedValueOnce({ id: 'std-1', kelasId: 'cls-1' });
    mockPrisma.sickLetter.findMany.mockResolvedValueOnce([{ filePath: 'uploads/letter.pdf' }]);
    mockPrisma.student.delete.mockResolvedValueOnce({ id: 'std-1' });

    await service.remove('std-1');

    expect(mockSickLetters.removeFiles).toHaveBeenCalledWith(['uploads/letter.pdf']);
  });

  it('[PRIVACY-03] remove() mempertahankan lampiran jika penghapusan siswa gagal', async () => {
    mockPrisma.student.findUnique.mockResolvedValueOnce({ id: 'std-1', kelasId: 'cls-1' });
    mockPrisma.sickLetter.findMany.mockResolvedValueOnce([{ filePath: 'uploads/letter.pdf' }]);
    mockPrisma.student.delete.mockRejectedValueOnce(new Error('attendance restrict'));

    await expect(service.remove('std-1')).rejects.toThrow('attendance restrict');
    expect(mockSickLetters.removeFiles).not.toHaveBeenCalled();
  });

  // [SEC-IDOR-01] Query siswa membatasi kelas otomatis untuk Ketua Kelas
  it('[SEC-IDOR-01] findAll() otomatis menyaring kelasId jika restrictedClassId ditentukan', async () => {
    mockPrisma.$transaction.mockResolvedValueOnce([
      [{ id: 'std-1', nis: '241101', nama: 'Ahmad', kelasId: 'cls-own', status: ActiveStatus.active, kelas: { nama: 'XI' } }],
      1,
    ]);

    const result = await service.findAll({ page: 1, limit: 10 }, 'cls-own');
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);

    const findManyArg = mockPrisma.student.findMany.mock.calls[0][0];
    expect(findManyArg.where.kelasId).toBe('cls-own');
  });

  // [PERF-N1-01] Pencegahan N+1: Ambil siswa + kelas dalam eager loading tunggal
  it('[PERF-N1-01] findAll() menyertakan eager load kelas dalam single query transaksi', async () => {
    mockPrisma.$transaction.mockResolvedValueOnce([[], 0]);

    await service.findAll({ page: 1, limit: 20 });
    const findManyArg = mockPrisma.student.findMany.mock.calls[0][0];
    expect(findManyArg.include).toBeDefined();
    expect(findManyArg.include.kelas).toBeDefined();
  });
});
