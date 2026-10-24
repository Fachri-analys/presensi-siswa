import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QueryAttendanceDto, QueryHistoryDto, QueryRecapDto } from './dto/query-attendance.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CreateAttendancePermissionDto } from './dto/create-attendance-permission.dto';

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

  @Patch(':id')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Koreksi satu catatan presensi' })
  updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.updateAttendance(id, dto, user);
  }

  @Post('permissions')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({ summary: 'Beri izin satu kali untuk mencatat Hadir/Terlambat di luar sesi' })
  grantPresentPermission(
    @Body() dto: CreateAttendancePermissionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.grantPresentPermission(dto, user);
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
  @Delete(':id')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Hapus catatan presensi berdasarkan ID (B4)' })
  deleteAttendance(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.attendanceService.deleteAttendance(id, user);
  }
}
