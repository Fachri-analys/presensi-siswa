import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSickLetterDto } from './dto/create-sick-letter.dto';
import { QuerySickLettersDto } from './dto/query-sick-letters.dto';
import { AttendanceStatus, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parseDateOnly, todayWib } from '../../common/utils/time.util';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 5 * 1024 * 1024);

export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class SickLettersService {
  private readonly logger = new Logger(SickLettersService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    dto: CreateSickLetterDto,
    file: UploadFile | undefined,
    user: SessionUser,
    idempotencyKey: string,
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey ?? '')) {
      throw new BadRequestException('Header Idempotency-Key harus berupa UUID v4.');
    }
    if (!file) {
      throw new BadRequestException('File surat izin/sakit wajib diunggah.');
    }

    // 1. Validasi Keamanan Ukuran File
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Ukuran file melebihi batas maksimum 5 MB.');
    }

    // 2. Validasi Keamanan MIME Type
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Format file tidak didukung. Harap unggah file berformat JPG, PNG, atau PDF.',
      );
    }

    const hasValidSignature =
      (file.mimetype === 'application/pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-') ||
      (file.mimetype === 'image/png' && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.mimetype === 'image/jpeg' && file.buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])));
    if (!hasValidSignature) {
      throw new BadRequestException('Isi file tidak sesuai dengan format yang diizinkan.');
    }

    // 3. Proteksi IDOR / BOLA: Ketua Kelas hanya dapat mengunggah untuk kelasnya
    if (user.role === Role.KETUA_KELAS && user.kelasId !== dto.kelasId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke kelas ini.');
    }

    // Validasi siswa ada di kelas yang bersangkutan (dukung ID maupun NIS)
    const student = await this.prisma.student.findFirst({
      where: {
        kelasId: dto.kelasId,
        OR: [{ id: dto.studentId }, { nis: dto.studentId }],
      },
    });
    if (!student) {
      throw new NotFoundException('Siswa tidak ditemukan pada kelas tersebut.');
    }

    const recordDate = parseDateOnly(dto.date);
    if (user.role === Role.KETUA_KELAS && dto.date !== todayWib()) {
      throw new ForbiddenException('Ketua Kelas hanya dapat mengirim surat untuk tanggal hari ini.');
    }

    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const requestHash = crypto.createHash('sha256').update(JSON.stringify({
      actorId: user.id,
      studentId: student.id,
      kelasId: dto.kelasId,
      date: dto.date,
      keterangan: dto.keterangan.trim(),
      fileHash,
    })).digest('hex');
    const existingLetter = await this.findExistingUpload(idempotencyKey, requestHash);
    if (existingLetter) return existingLetter;

    // 4. Sanitasi nama file & cegah path traversal menggunakan hash unik
    const safeExt = file.mimetype === 'image/jpeg' ? '.jpg' : file.mimetype === 'image/png' ? '.png' : '.pdf';
    const randomName = `${crypto.randomUUID()}${safeExt}`;
    const destinationPath = path.join(this.uploadDir, randomName);

    // Simpan buffer file secara aman
    fs.writeFileSync(destinationPath, file.buffer, { flag: 'wx', mode: 0o600 });

    // Simpan metadata ke database
    try {
      return await this.prisma.$transaction(async (tx) => {
        const letter = await tx.sickLetter.create({
          data: {
            date: recordDate,
            kelasId: dto.kelasId,
            studentId: student.id,
            keterangan: dto.keterangan,
            fileName: randomName,
            filePath: destinationPath,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedById: user.id,
            idempotencyKey,
            requestHash,
          },
          select: {
            id: true,
            date: true,
            kelasId: true,
            studentId: true,
            keterangan: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedById: true,
            createdAt: true,
          },
        });
        await tx.attendance.upsert({
          where: { date_kelasId_studentId: { date: recordDate, kelasId: dto.kelasId, studentId: student.id } },
          create: {
            date: recordDate,
            kelasId: dto.kelasId,
            studentId: student.id,
            status: AttendanceStatus.SAKIT,
            waktu: null,
            keterangan: `Surat sakit: ${dto.keterangan.trim()}`.slice(0, 120),
            createdById: user.id,
            updatedById: user.id,
          },
          update: {
            status: AttendanceStatus.SAKIT,
            waktu: null,
            keterangan: `Surat sakit: ${dto.keterangan.trim()}`.slice(0, 120),
            updatedById: user.id,
          },
        });
        return letter;
      });
    } catch (error) {
      fs.rmSync(destinationPath, { force: true });
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        const existing = await this.findExistingUpload(idempotencyKey, requestHash);
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async findExistingUpload(idempotencyKey: string, requestHash: string) {
    const existing = await this.prisma.sickLetter.findUnique({
      where: { idempotencyKey },
      select: { id: true, requestHash: true },
    });
    if (!existing) return null;
    if (existing.requestHash !== requestHash) {
      throw new ConflictException('Idempotency-Key sudah dipakai untuk data surat yang berbeda.');
    }
    return this.prisma.sickLetter.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        date: true,
        kelasId: true,
        studentId: true,
        keterangan: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        uploadedById: true,
        createdAt: true,
      },
    });
  }

  async findByClass(kelasId: string, query: QuerySickLettersDto, user: SessionUser) {
    if (user.role === Role.KETUA_KELAS && user.kelasId !== kelasId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where = { kelasId };
    const [items, total] = await Promise.all([
      this.prisma.sickLetter.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          date: true,
          kelasId: true,
          studentId: true,
          keterangan: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          uploadedById: true,
          createdAt: true,
          student: { select: { nis: true, nama: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.sickLetter.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      nextCursor: page * limit < total ? String(page + 1) : null,
    };
  }

  async getFile(id: string, user: SessionUser) {
    const letter = await this.prisma.sickLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Surat tidak ditemukan.');
    if (user.role === Role.KETUA_KELAS && user.kelasId !== letter.kelasId) {
      throw new ForbiddenException('Akses ditolak.');
    }
    const expectedDirectory = path.resolve(this.uploadDir) + path.sep;
    const filePath = path.resolve(letter.filePath);
    if (!filePath.startsWith(expectedDirectory) || !fs.existsSync(filePath)) {
      throw new NotFoundException('Berkas surat tidak ditemukan.');
    }
    return { filePath, fileName: letter.fileName, mimeType: letter.mimeType };
  }

  removeFiles(filePaths: string[]) {
    const uploadRoot = path.resolve(this.uploadDir);
    for (const filePath of filePaths) {
      const absolutePath = path.resolve(filePath);
      if (path.dirname(absolutePath) !== uploadRoot) {
        this.logger.warn('Lampiran siswa dilewati karena path berada di luar direktori upload.');
        continue;
      }
      try {
        fs.rmSync(absolutePath, { force: true });
      } catch (error) {
        this.logger.error(`Gagal menghapus lampiran ${path.basename(absolutePath)}.`, error);
      }
    }
  }
}
