import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ReqContext,
  type RequestContext,
} from '../../common/decorators/request-context.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { SessionUser } from '../../common/types/session-user.type';
import { SchedulesService } from './schedules.service';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

// AuthGuard dan RolesGuard sudah global (APP_GUARD), jadi tidak perlu @UseGuards.
@ApiTags('Schedules')
@ApiCookieAuth('session')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'List jam sesi presensi' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.schedulesService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Detail jam sesi' })
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update jam sesi (Admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: SessionUser,
    @ReqContext() ctx: RequestContext,
  ) {
    return this.schedulesService.update(id, dto, user, ctx);
  }

  @Post(':id/toggle-lock')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kunci/buka jam sesi (Admin)' })
  toggleLock(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
    @ReqContext() ctx: RequestContext,
  ) {
    return this.schedulesService.toggleLock(id, user, ctx);
  }
}