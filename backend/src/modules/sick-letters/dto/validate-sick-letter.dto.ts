import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SickLetterStatus } from '@prisma/client';

export class ValidateSickLetterDto {
  @ApiProperty({ enum: [SickLetterStatus.VALID, SickLetterStatus.INVALID], example: SickLetterStatus.VALID })
  @IsEnum(SickLetterStatus, { message: 'Status validasi harus VALID atau INVALID.' })
  status!: SickLetterStatus;

  @ApiPropertyOptional({ example: 'Surat dokter terverifikasi dari RS/Puskesmas' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Catatan validator maksimal 255 karakter.' })
  catatan?: string;
}
