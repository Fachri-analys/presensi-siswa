import { Test, TestingModule } from '@nestjs/testing';
import { SickLettersService } from './sick-letters.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as fs from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('SickLettersService (Keamanan Upload File)', () => {
  let service: SickLettersService;
  let mockPrisma: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      student: {
        findFirst: jest.fn(),
      },
      sickLetter: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      attendance: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SickLettersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SickLettersService>(SickLettersService);
  });

  // [SEC-04] Upload file menolak format berbahaya / tidak diizinkan
  it('[SEC-04] uploadFile() menolak file berekstensi/mime berbahaya (misal shell script / executable)', async () => {
    const user = { id: 'usr-1', email: 'test@sch.id', nama: 'Ketua', role: Role.KETUA_KELAS, kelasId: 'cls-1' };
    const fakeMaliciousFile = {
      originalname: 'exploit.sh',
      mimetype: 'application/x-sh',
      size: 1024,
      buffer: Buffer.from('echo hack'),
    };

    await expect(
      service.uploadFile(
        { date: '2026-10-16', kelasId: 'cls-1', studentId: 'std-1', keterangan: 'Sakit' },
        fakeMaliciousFile,
        user,
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // [SEC-05] Upload file menolak file melebihi batas 5MB
  it('[SEC-05] uploadFile() menolak file yang ukurannya melebihi 5 MB', async () => {
    const user = { id: 'usr-1', email: 'test@sch.id', nama: 'Ketua', role: Role.KETUA_KELAS, kelasId: 'cls-1' };
    const oversizedFile = {
      originalname: 'huge_document.pdf',
      mimetype: 'application/pdf',
      size: 6 * 1024 * 1024, // 6 MB
      buffer: Buffer.alloc(100),
    };

    await expect(
      service.uploadFile(
        { date: '2026-10-16', kelasId: 'cls-1', studentId: 'std-1', keterangan: 'Sakit' },
        oversizedFile,
        user,
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // [SEC-IDOR-03] Ketua Kelas dilarang mengunggah untuk kelas lain
  it('[SEC-IDOR-03] uploadFile() menolak jika Ketua Kelas mengunggah untuk kelas yang bukan miliknya', async () => {
    const user = { id: 'usr-1', email: 'test@sch.id', nama: 'Ketua', role: Role.KETUA_KELAS, kelasId: 'cls-own' };
    const validFile = {
      originalname: 'surat.jpg',
      mimetype: 'image/jpeg',
      size: 10240,
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    };

    await expect(
      service.uploadFile(
        { date: '2026-10-16', kelasId: 'cls-other', studentId: 'std-1', keterangan: 'Sakit' },
        validFile,
        user,
        '11111111-1111-4111-8111-111111111111',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // [SEC-06] File yang diunggah disanitasi namanya dengan UUID unik
  it('[SEC-06] uploadFile() menyimpan file dengan nama hash UUID unik untuk mencegah directory traversal', async () => {
    const user = { id: 'usr-1', email: 'test@sch.id', nama: 'Guru Piket', role: Role.GURU_PIKET, kelasId: null };
    const validFile = {
      originalname: '../../../etc/passwd.png', // Percobaan path traversal
      mimetype: 'image/png',
      size: 2048,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    };

    mockPrisma.student.findFirst.mockResolvedValueOnce({ id: 'std-1', kelasId: 'cls-1' });
    mockPrisma.sickLetter.create.mockImplementation((args: { data: Record<string, unknown> }) => Promise.resolve(args.data));

    const result = await service.uploadFile(
      { date: '2026-10-16', kelasId: 'cls-1', studentId: 'std-1', keterangan: 'Sakit' },
      validFile,
      user,
      '11111111-1111-4111-8111-111111111111',
    );

    expect(result.fileName).not.toContain('..');
    expect(result.fileName).toMatch(/^[0-9a-f-]+\.png$/i);
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(mockPrisma.attendance.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: 'SAKIT' }),
      update: expect.objectContaining({ status: 'SAKIT' }),
    }));
  });

  it('[REL-LET-01] retry dengan Idempotency-Key dan payload sama mengembalikan surat yang sama', async () => {
    const user = { id: 'usr-1', email: 'guru@test.com', nama: 'Guru Piket', role: Role.GURU_PIKET, kelasId: null };
    const dto = { date: '2026-10-16', kelasId: 'cls-1', studentId: 'std-1', keterangan: 'Sakit' };
    const file = {
      originalname: 'surat.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    };
    const key = '11111111-1111-4111-8111-111111111111';
    mockPrisma.student.findFirst.mockResolvedValue({ id: 'std-1', kelasId: 'cls-1' });
    mockPrisma.sickLetter.create.mockImplementation((args: { data: Record<string, unknown> }) => Promise.resolve({
      id: 'letter-1',
      ...args.data,
      createdAt: new Date('2026-10-16T00:00:00.000Z'),
    }));

    const first = await service.uploadFile(dto, file, user, key);
    const savedData = mockPrisma.sickLetter.create.mock.calls[0][0].data;
    mockPrisma.sickLetter.findUnique
      .mockResolvedValueOnce({ id: first.id, requestHash: savedData.requestHash })
      .mockResolvedValueOnce({ id: first.id, date: first.date, kelasId: first.kelasId });

    const retry = await service.uploadFile(dto, file, user, key);

    expect(retry.id).toBe(first.id);
    expect(mockPrisma.sickLetter.create).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('[PERF-LET-01] findByClass() membatasi riwayat surat dengan pagination', async () => {
    mockPrisma.sickLetter.findMany.mockResolvedValueOnce([{ id: 'letter-1' }]);
    mockPrisma.sickLetter.count.mockResolvedValueOnce(51);
    const admin = { id: 'admin-1', email: 'admin@test.com', nama: 'Admin', role: Role.ADMIN, kelasId: null };

    const result = await service.findByClass('cls-1', { page: 2, limit: 20 }, admin);

    expect(mockPrisma.sickLetter.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { kelasId: 'cls-1' },
      skip: 20,
      take: 20,
    }));
    expect(result).toMatchObject({ total: 51, page: 2, limit: 20, totalPages: 3, nextCursor: '3' });
  });
});
