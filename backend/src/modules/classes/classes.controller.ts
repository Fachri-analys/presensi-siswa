import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { SessionUser } from '../../common/types/session-user.type';
import { AssignClassLeaderDto } from './dto/assign-class-leader.dto';

@ApiTags('Classes')
@ApiCookieAuth('session')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Daftar semua kelas' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.classesService.findAll(user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Detail kelas' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.classesService.findOne(id, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tambah kelas baru (Hanya Admin)' })
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Perbarui data kelas (Hanya Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Patch(':id/leader')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tetapkan Ketua Kelas (Hanya Admin)' })
  assignLeader(
    @Param('id') id: string,
    @Body() dto: AssignClassLeaderDto,
  ) {
    return this.classesService.assignLeader(id, dto.leaderUserId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus kelas (Hanya Admin)' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
