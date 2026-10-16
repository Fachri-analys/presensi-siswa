import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Monitoring')
@ApiCookieAuth('session')
@UseGuards(AuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Ringkasan kehadiran seluruh kelas (Admin & Guru Piket)' })
  getSummary(@Query('date') date: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.monitoringService.getSummary(targetDate);
  }
}
