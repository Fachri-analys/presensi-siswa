import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

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

    const plainPassword = dto.password || randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(plainPassword, 10);

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
    await this.findOne(id);

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

    const data: Prisma.UserUpdateInput = {};
    if (dto.nama !== undefined) data.nama = dto.nama.trim();
    if (dto.email !== undefined) data.email = dto.email.toLowerCase().trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.kelasId !== undefined) data.kelasAsLeader = dto.kelasId ? { connect: { id: dto.kelasId } } : { disconnect: true };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
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

    return {
      ...updated,
      active: updated.status === 'active',
    };
  }

  async resetPassword(id: string) {
    await this.findOne(id);
    const tempPassword = randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Invalidate existing sessions for security
    await this.prisma.session.deleteMany({
      where: { userId: id },
    });

    return {
      accepted: true,
      temporaryPassword: tempPassword,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({
      where: { id },
    });
    return { success: true };
  }
}
