import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Monitoring')
@ApiCookieAuth('session')
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
