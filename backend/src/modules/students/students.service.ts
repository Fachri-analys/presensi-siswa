import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryStudentDto, restrictedClassId?: string | null) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {};

    // IDOR / BOLA Prevention: jika restrictedClassId ditentukan (misal untuk Ketua Kelas)
    if (restrictedClassId) {
      where.kelasId = restrictedClassId;
    } else if (query.kelasId) {
      where.kelasId = query.kelasId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { nis: { contains: search, mode: 'insensitive' } },
        { nama: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Menggunakan eager loading kelas dan transaksi untuk mencegah N+1 query
    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ kelasId: 'asc' }, { nis: 'asc' }],
        include: {
          kelas: {
            select: { id: true, nama: true, jurusan: true },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        nis: s.nis,
        nama: s.nama,
        kelasId: s.kelasId,
        status: s.status,
        kelasNama: s.kelas?.nama ?? '',
      })),
      nextCursor: skip + limit < total ? String(page + 1) : null,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { kelas: true },
    });
    if (!student) {
      throw new NotFoundException(`Siswa dengan ID "${id}" tidak ditemukan.`);
    }
    return student;
  }

  async create(dto: CreateStudentDto) {
    // Validasi kelas ada
    const classExists = await this.prisma.class.findUnique({
      where: { id: dto.kelasId },
    });
    if (!classExists) {
      throw new NotFoundException(`Kelas dengan ID "${dto.kelasId}" tidak ditemukan.`);
    }

    // Cek duplikasi NIS
    const existingNis = await this.prisma.student.findUnique({
      where: { nis: dto.nis },
    });
    if (existingNis) {
      throw new ConflictException(`Siswa dengan NIS "${dto.nis}" sudah terdaftar.`);
    }

    return this.prisma.student.create({
      data: {
        nis: dto.nis,
        nama: dto.nama,
        kelasId: dto.kelasId,
      },
      include: { kelas: true },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);

    if (dto.kelasId) {
      const classExists = await this.prisma.class.findUnique({
        where: { id: dto.kelasId },
      });
      if (!classExists) {
        throw new NotFoundException(`Kelas dengan ID "${dto.kelasId}" tidak ditemukan.`);
      }
    }

    if (dto.nis) {
      const existing = await this.prisma.student.findUnique({
        where: { nis: dto.nis },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`NIS "${dto.nis}" sudah digunakan siswa lain.`);
      }
    }

    return this.prisma.student.update({
      where: { id },
      data: dto,
      include: { kelas: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.student.delete({
      where: { id },
    });
  }
}
