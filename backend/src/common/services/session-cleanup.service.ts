import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Periodically removes expired sessions from the database
 * to prevent table bloat under high concurrent usage.
 */
@Injectable()
export class SessionCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(SessionCleanupService.name);
  private intervalRef: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start periodic cleanup of expired sessions.
   * Default interval: every 30 minutes.
   */
  startPeriodicCleanup(intervalMs = 30 * 60 * 1000): void {
    this.intervalRef = setInterval(() => {
      void this.cleanExpiredSessions();
    }, intervalMs);
    this.logger.log(
      `Session cleanup scheduled every ${intervalMs / 60000} minutes`,
    );
  }

  stopPeriodicCleanup(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  onModuleDestroy(): void {
    this.stopPeriodicCleanup();
  }

  async cleanExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired session(s)`);
      }
      return result.count;
    } catch (error) {
      this.logger.error('Failed to clean expired sessions', error);
      return 0;
    }
  }
}
