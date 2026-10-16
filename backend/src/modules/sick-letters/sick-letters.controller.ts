import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SickLettersService, type UploadFile } from './sick-letters.service';
import { CreateSickLetterDto } from './dto/create-sick-letter.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';

@ApiTags('SickLetters')
@ApiCookieAuth('session')
@UseGuards(AuthGuard, RolesGuard)
@Controller('sick-letters')
export class SickLettersController {
  constructor(private readonly sickLettersService: SickLettersService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Unggah surat izin/sakit dengan validasi keamanan' })
  upload(
    @Body() dto: CreateSickLetterDto,
    @UploadedFile() file: UploadFile,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sickLettersService.uploadFile(dto, file, user);
  }

  @Get('class/:kelasId')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Daftar surat izin/sakit berdasarkan kelas' })
  findByClass(
    @Param('kelasId') kelasId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sickLettersService.findByClass(kelasId, user);
  }
}
