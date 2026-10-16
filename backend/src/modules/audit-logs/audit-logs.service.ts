import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.objectType) {
      where.objectType = query.objectType;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { objectType: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Eager loading `actor` to prevent N+1 query problem
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              nama: true,
              role: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        action: log.action,
        objectType: log.objectType,
        objectId: log.objectId,
        result: log.result,
        metadata: log.metadata,
        requestId: log.requestId,
        createdAt: log.createdAt.toISOString(),
        actor: log.actor
          ? {
              id: log.actor.id,
              nama: log.actor.nama,
              role: log.actor.role,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      nextCursor: page * limit < total ? String(page + 1) : null,
    };
  }
}
