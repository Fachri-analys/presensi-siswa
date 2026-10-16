import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSickLetterDto } from './dto/create-sick-letter.dto';
import { Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class SickLettersService {
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
  ) {
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

    // 3. Proteksi IDOR / BOLA: Ketua Kelas hanya dapat mengunggah untuk kelasnya
    if (user.role === Role.KETUA_KELAS && user.kelasId !== dto.kelasId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke kelas ini.');
    }

    // Validasi siswa ada di kelas yang bersangkutan
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student || student.kelasId !== dto.kelasId) {
      throw new NotFoundException('Siswa tidak ditemukan pada kelas tersebut.');
    }

    // 4. Sanitasi nama file & cegah path traversal menggunakan hash unik
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ['.jpg', '.jpeg', '.png', '.pdf'].includes(ext) ? ext : '.bin';
    const randomName = `${crypto.randomUUID()}${safeExt}`;
    const destinationPath = path.join(this.uploadDir, randomName);

    // Simpan buffer file secara aman
    fs.writeFileSync(destinationPath, file.buffer);

    const recordDate = new Date(dto.date);

    // Simpan metadata ke database
    return this.prisma.sickLetter.create({
      data: {
        date: new Date(Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate())),
        kelasId: dto.kelasId,
        studentId: dto.studentId,
        keterangan: dto.keterangan,
        fileName: randomName,
        filePath: destinationPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: user.id,
      },
    });
  }

  async findByClass(kelasId: string, user: SessionUser) {
    if (user.role === Role.KETUA_KELAS && user.kelasId !== kelasId) {
      throw new ForbiddenException('Akses ditolak.');
    }

    return this.prisma.sickLetter.findMany({
      where: { kelasId },
      include: {
        student: { select: { nis: true, nama: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
