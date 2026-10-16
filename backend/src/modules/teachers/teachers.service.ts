import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ActiveStatus } from '@prisma/client';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const teachers = await this.prisma.teacher.findMany({
      orderBy: { nama: 'asc' },
    });
    return teachers.map((t) => ({
      id: t.id,
      nip: t.nip,
      nama: t.nama,
      status: t.status,
      active: t.status === ActiveStatus.active,
    }));
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
    });
    if (!teacher) {
      throw new NotFoundException(`Guru dengan ID "${id}" tidak ditemukan.`);
    }
    return {
      id: teacher.id,
      nip: teacher.nip,
      nama: teacher.nama,
      status: teacher.status,
      active: teacher.status === ActiveStatus.active,
    };
  }

  async create(dto: CreateTeacherDto) {
    const existing = await this.prisma.teacher.findUnique({
      where: { nip: dto.nip },
    });
    if (existing) {
      throw new ConflictException(`Guru dengan NIP "${dto.nip}" sudah terdaftar.`);
    }

    return this.prisma.teacher.create({
      data: {
        nip: dto.nip,
        nama: dto.nama,
        status: ActiveStatus.active,
      },
    });
  }

  async update(id: string, dto: UpdateTeacherDto) {
    await this.findOne(id);

    if (dto.nip) {
      const existing = await this.prisma.teacher.findUnique({
        where: { nip: dto.nip },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`NIP "${dto.nip}" sudah terdaftar.`);
      }
    }

    return this.prisma.teacher.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.teacher.delete({
      where: { id },
    });
  }
}
