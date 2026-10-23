import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { todayWib } from '../../common/utils/time.util';

@ApiTags('Monitoring')
@ApiCookieAuth('session')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Ringkasan kehadiran seluruh kelas (Admin & Guru Piket)' })
  getSummary(@Query('date') date?: string) {
    const targetDate = date || todayWib();
    return this.monitoringService.getSummary(targetDate);
  }
}
