import { Injectable, Logger } from '@nestjs/common';
import { AuditResult, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  result: AuditResult;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tulis audit log di luar transaksi bisnis. Tidak pernah throw:
   * kegagalan audit tidak boleh menggagalkan aksi utama.
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? null,
          action: input.action,
          objectType: input.objectType,
          objectId: input.objectId ?? null,
          result: input.result,
          // Round-trip JSON supaya Date/undefined di metadata jadi JSON valid.
          metadata: input.metadata
            ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
            : undefined,
          requestId: input.requestId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Gagal menulis audit log: ${input.action} ${input.objectType}`,
        err as Error,
      );
    }
  }

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
        { action: { contains: search } },
        { objectType: { contains: search } },
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
