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
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { assertClassAccess } from '../../common/utils/access-control.util';
import { Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';

@ApiTags('Students')
@ApiCookieAuth('session')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Daftar siswa dengan filter, pencarian, dan pagination' })
  findAll(
    @Query() query: QueryStudentDto,
    @CurrentUser() user?: SessionUser,
  ) {
    if (user?.role === Role.KETUA_KELAS) {
      assertClassAccess(user, query.kelasId);
    }
    const restrictedClassId = user?.role === Role.KETUA_KELAS ? user.kelasId : null;
    return this.studentsService.findAll(query, restrictedClassId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Detail siswa berdasarkan ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: SessionUser,
  ) {
    const student = await this.studentsService.findOne(id);
    assertClassAccess(user, student.kelasId);
    return student;
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Tambah siswa baru (Hanya Admin)' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Perbarui data siswa (Hanya Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hapus data siswa (Hanya Admin)' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
