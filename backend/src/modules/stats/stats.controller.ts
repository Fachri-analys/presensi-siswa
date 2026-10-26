import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { SessionUser } from '../../common/types/session-user.type';
import { StatsService } from './stats.service';
import {
  QueryAttendanceStatsDto,
  QueryClassComparisonDto,
  QueryProblematicStudentsDto,
} from './dto/query-stats.dto';

// AuthGuard dan RolesGuard sudah global (APP_GUARD), jadi tidak perlu @UseGuards.
// Data statistik lintas kelas: dibatasi Admin dan Guru Piket.
@ApiTags('Stats')
@ApiCookieAuth('session')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('attendance')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Tren kehadiran (day/month), Admin/Guru Piket' })
  attendance(
    @Query() query: QueryAttendanceStatsDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.statsService.attendanceTrend(query, user);
  }

  @Get('problematic-students')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Top siswa bermasalah (alpa terbanyak)' })
  problematic(
    @Query() query: QueryProblematicStudentsDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.statsService.problematicStudents(query, user);
  }

  @Get('class-comparison')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Perbandingan antar kelas (alpa + persentase)' })
  classComparison(
    @Query() query: QueryClassComparisonDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.statsService.classComparison(query, user);
  }
}