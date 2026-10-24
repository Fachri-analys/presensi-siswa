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
    mockPrisma = {
      student: {
        findFirst: jest.fn(),
      },
      sickLetter: {
        create: jest.fn(),
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
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // [SEC-06] File yang diunggah disanitasi namanya dengan UUID unik
  it('[SEC-06] uploadFile() menyimpan file dengan nama hash UUID unik untuk mencegah directory traversal', async () => {
    const user = { id: 'usr-1', email: 'test@sch.id', nama: 'Ketua', role: Role.KETUA_KELAS, kelasId: 'cls-1' };
    const validFile = {
      originalname: '../../../etc/passwd.png', // Percobaan path traversal
      mimetype: 'image/png',
      size: 2048,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    };

    mockPrisma.student.findFirst.mockResolvedValueOnce({ id: 'std-1', kelasId: 'cls-1' });
    mockPrisma.sickLetter.create.mockImplementation((args: any) => Promise.resolve(args.data));

    const result = await service.uploadFile(
      { date: '2026-10-16', kelasId: 'cls-1', studentId: 'std-1', keterangan: 'Sakit' },
      validFile,
      user,
    );

    expect(result.fileName).not.toContain('..');
    expect(result.fileName).toMatch(/^[0-9a-f-]+\.png$/i);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
