import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ReqContext,
  type RequestContext,
} from '../../common/decorators/request-context.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { SessionUser } from '../../common/types/session-user.type';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryStudentReportDto } from './dto/query-student-report.dto';

// AuthGuard dan RolesGuard sudah global (APP_GUARD), jadi tidak perlu @UseGuards.
@ApiTags('Reports')
@ApiCookieAuth('session')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Rekap laporan per kelas (scope role)' })
  attendance(@Query() query: QueryReportDto, @CurrentUser() user: SessionUser) {
    return this.reportsService.attendance(query, user);
  }

  @Get('attendance/summary')
  @Roles(Role.ADMIN, Role.GURU_PIKET)
  @ApiOperation({
    summary:
      'Statistik global per kelas (Admin, Guru Piket). Hanya kelas yang punya data presensi di rentang.',
  })
  summary(@Query() query: QuerySummaryDto, @CurrentUser() user: SessionUser) {
    return this.reportsService.summary(query, user);
  }

  @Get('attendance/student/:studentId')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({
    summary:
      'Rekap per siswa lintas kelas (Admin, Guru Piket; Ketua Kelas hanya siswa di kelasnya)',
  })
  studentReport(
    @Param('studentId') studentId: string,
    @Query() query: QueryStudentReportDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.reportsService.studentReport(studentId, query, user);
  }

  @Get('attendance/export')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({
    summary:
      'Export CSV rekap kelas (scope role). Header + data + footer TOTAL.',
  })
  async export(
    @Query() query: QueryReportDto,
    @CurrentUser() user: SessionUser,
    @ReqContext() ctx: RequestContext,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.exportCsv(query, user, ctx);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader('X-Request-Id', ctx.requestId ?? '');
    res.send(result.csv);
  }
}