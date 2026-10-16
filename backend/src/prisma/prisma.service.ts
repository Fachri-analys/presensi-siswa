import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes('connection_limit')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}connection_limit=50&pool_timeout=30`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const optimizedUrl = getOptimizedDatabaseUrl();
    super(
      optimizedUrl
        ? {
            datasources: {
              db: {
                url: optimizedUrl,
              },
            },
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
          }
        : undefined,
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database (connection_limit=50, pool_timeout=30s)');
    } catch (err) {
      this.logger.error('Failed to connect to database', err as Error);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
