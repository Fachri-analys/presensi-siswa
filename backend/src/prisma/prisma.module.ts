import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SessionCleanupService } from '../common/services/session-cleanup.service';

@Global()
@Module({
  providers: [PrismaService, SessionCleanupService],
  exports: [PrismaService, SessionCleanupService],
})
export class PrismaModule {}
