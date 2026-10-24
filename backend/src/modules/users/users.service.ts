import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ActiveStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUserDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const formatUser = (u: any) => ({
      id: u.id,
      email: u.email,
      nama: u.nama,
      role: u.role,
      status: u.status,
      active: u.status === 'active',
      kelasId: u.kelasId ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });

    const [rawItems, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nama: true,
          role: true,
          status: true,
          kelasId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rawItems.map(formatUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      nextCursor: page * limit < total ? String(page + 1) : null,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        status: true,
        kelasId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan.`);
    }

    return {
      ...user,
      active: user.status === 'active',
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException(`Email ${dto.email} sudah terdaftar.`);
    }

    await this.validateRoleAssignment(dto.role, dto.kelasId ?? null);
    const passwordHash = await bcrypt.hash(dto.password, Number(process.env.BCRYPT_ROUNDS ?? 12));

    const user = await this.prisma.user.create({
      data: {
        nama: dto.nama.trim(),
        email: dto.email.toLowerCase().trim(),
        role: dto.role,
        passwordHash,
        kelasId: dto.kelasId ?? null,
      },
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        status: true,
        kelasId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      active: user.status === 'active',
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const current = await this.findOne(id);

    if (dto.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase().trim(),
          NOT: { id },
        },
      });

      if (emailConflict) {
        throw new ConflictException(`Email ${dto.email} sudah digunakan pengguna lain.`);
      }
    }

    await this.validateRoleAssignment(
      dto.role ?? current.role,
      dto.kelasId === undefined ? current.kelasId : dto.kelasId,
      id,
    );

    const data: Prisma.UserUpdateInput = {};
    if (dto.nama !== undefined) data.nama = dto.nama.trim();
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.kelasId !== undefined) data.kelasAsLeader = dto.kelasId ? { connect: { id: dto.kelasId } } : { disconnect: true };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, Number(process.env.BCRYPT_ROUNDS ?? 12));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          nama: true,
          role: true,
          status: true,
          kelasId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (dto.password || dto.status === ActiveStatus.inactive) {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      return user;
    });

    return {
      ...updated,
      active: updated.status === 'active',
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({
      where: { id },
    });
    return { success: true };
  }

  private async validateRoleAssignment(role: Role, kelasId: string | null, excludeUserId?: string) {
    if (role === Role.KETUA_KELAS && !kelasId) {
      throw new ConflictException('Akun Ketua Kelas harus ditugaskan ke satu kelas.');
    }
    if (role !== Role.KETUA_KELAS && kelasId) {
      throw new ConflictException('Hanya akun Ketua Kelas yang dapat ditugaskan ke kelas.');
    }
    if (!kelasId) return;

    const kelas = await this.prisma.class.findUnique({ where: { id: kelasId }, select: { status: true } });
    if (!kelas || kelas.status !== ActiveStatus.active) {
      throw new ConflictException('Ketua Kelas harus ditugaskan ke kelas yang aktif.');
    }
    const existingLeader = await this.prisma.user.findFirst({
      where: { kelasId, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    });
    if (existingLeader) throw new ConflictException('Kelas ini sudah memiliki akun Ketua Kelas.');
  }
}
