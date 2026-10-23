import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QueryAttendanceDto, QueryHistoryDto, QueryRecapDto } from './dto/query-attendance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceSession, Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';

@ApiTags('Attendance')
@ApiCookieAuth('session')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Ambil data presensi kelas untuk tanggal tertentu' })
  findByClassAndDate(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.findByClassAndDate(query, user);
  }

  @Post('batch')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Simpan presensi seluruh kelas secara batch (atomik)' })
  saveBatch(
    @Body() dto: BatchAttendanceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.saveBatch(dto, user);
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Riwayat presensi kelas per rentang tanggal' })
  getHistory(
    @Query() query: QueryHistoryDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.getHistory(query, user);
  }

  @Get('recap')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Rekap kehadiran semester per siswa (optimasi agregasi database)' })
  getRecap(
    @Query() query: QueryRecapDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.getRecap(query, user);
  }

  @Get('schedules')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Daftar jadwal sesi presensi' })
  getSchedules() {
    return this.attendanceService.getSchedules();
  }

  @Patch('schedules/:session')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Update jam sesi / kunci sesi presensi (Admin & Guru Piket)' })
  updateSchedule(
    @Param('session') session: AttendanceSession,
    @Body() dto: { mulai?: string; selesai?: string; terkunci?: boolean },
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.updateSchedule(session, dto, user);
  }
}
