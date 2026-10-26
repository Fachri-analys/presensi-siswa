import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Header,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { SickLettersService, type UploadFile } from './sick-letters.service';
import { CreateSickLetterDto } from './dto/create-sick-letter.dto';
import { QuerySickLettersDto } from './dto/query-sick-letters.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { SessionUser } from '../../common/types/session-user.type';

@ApiTags('SickLetters')
@ApiCookieAuth('session')
@Controller('sick-letters')
export class SickLettersController {
  constructor(private readonly sickLettersService: SickLettersService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.UPLOAD_MAX_SIZE_BYTES ?? 5 * 1024 * 1024) },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Unggah surat izin/sakit dengan validasi keamanan' })
  upload(
    @Body() dto: CreateSickLetterDto,
    @UploadedFile() file: UploadFile,
    @CurrentUser() user: SessionUser,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.sickLettersService.uploadFile(dto, file, user, idempotencyKey);
  }

  @Get(':id/file')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  async getFile(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    const file = await this.sickLettersService.getFile(id, user);
    return new StreamableFile(createReadStream(file.filePath), {
      type: file.mimeType,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get('class/:kelasId')
  @Roles(Role.ADMIN, Role.GURU_PIKET, Role.KETUA_KELAS)
  @ApiOperation({ summary: 'Daftar surat izin/sakit berdasarkan kelas' })
  findByClass(
    @Param('kelasId') kelasId: string,
    @Query() query: QuerySickLettersDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.sickLettersService.findByClass(kelasId, query, user);
  }
}
