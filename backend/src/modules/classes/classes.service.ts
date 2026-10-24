import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ActiveStatus, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import { assertClassAccess } from '../../common/utils/access-control.util';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: SessionUser) {
    // Eager loading leader dan count students untuk mencegah N+1 query
    const classes = await this.prisma.class.findMany({
      where: user.role === Role.KETUA_KELAS ? { id: user.kelasId ?? '' } : undefined,
      orderBy: { nama: 'asc' },
      include: {
        leader: {
          select: { id: true, nama: true, email: true },
        },
        _count: {
          select: {
            students: {
              where: { status: ActiveStatus.active },
            },
          },
        },
      },
    });

    return classes.map((c) => ({
      id: c.id,
      nama: c.nama,
      jurusan: c.jurusan,
      status: c.status,
      active: c.status === ActiveStatus.active,
      ketuaAkunId: c.leader?.id ?? null,
      ketuaNama: c.leader?.nama ?? null,
      totalSiswa: c._count.students,
    }));
  }

  async findOne(id: string, user?: SessionUser) {
    if (user) assertClassAccess(user, id);
    const item = await this.prisma.class.findUnique({
      where: { id },
      include: {
        leader: {
          select: { id: true, nama: true, email: true },
        },
        _count: {
          select: { students: true },
        },
      },
    });
    if (!item) {
      throw new NotFoundException(`Kelas dengan ID "${id}" tidak ditemukan.`);
    }
    return {
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      status: item.status,
      active: item.status === ActiveStatus.active,
      ketuaAkunId: item.leader?.id ?? null,
      ketuaNama: item.leader?.nama ?? null,
      totalSiswa: item._count?.students ?? 0,
    };
  }

  async create(dto: CreateClassDto) {
    const existing = await this.prisma.class.findUnique({
      where: { nama: dto.nama },
    });
    if (existing) {
      throw new ConflictException(`Kelas "${dto.nama}" sudah ada.`);
    }

    const created = await this.prisma.class.create({
      data: {
        nama: dto.nama,
        jurusan: dto.jurusan,
        status: ActiveStatus.active,
      },
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.findOne(id);

    if (dto.nama) {
      const existing = await this.prisma.class.findUnique({
        where: { nama: dto.nama },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Nama kelas "${dto.nama}" sudah digunakan.`);
      }
    }

    await this.prisma.class.update({
      where: { id },
      data: dto,
    });

    return this.findOne(id);
  }

  async assignLeader(kelasId: string, leaderUserId: string | null) {
    await this.findOne(kelasId);

    if (leaderUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: leaderUserId },
      });
      if (!user) {
        throw new NotFoundException(`User dengan ID "${leaderUserId}" tidak ditemukan.`);
      }
      if (user.role !== Role.KETUA_KELAS || user.status !== ActiveStatus.active) {
        throw new ConflictException('Ketua kelas harus memakai akun Ketua Kelas yang aktif.');
      }
      if (user.kelasId && user.kelasId !== kelasId) {
        throw new ConflictException('Akun Ketua Kelas sudah ditugaskan ke kelas lain.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.updateMany({ where: { kelasId, id: { not: leaderUserId } }, data: { kelasId: null } });
        await tx.user.update({ where: { id: leaderUserId }, data: { kelasId } });
      });
    } else {
      await this.prisma.user.updateMany({
        where: { kelasId },
        data: { kelasId: null },
      });
    }

    return this.findOne(kelasId);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.class.delete({
      where: { id },
    });
  }
}
