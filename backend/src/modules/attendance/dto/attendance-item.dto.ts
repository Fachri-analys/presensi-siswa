import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceItemDto {
  @ApiProperty({ example: '241101' })
  @IsString()
  @IsNotEmpty()
  nis!: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.HADIR })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional({ example: '07:15' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  waktu?: string | null;

  @ApiPropertyOptional({ example: 'Hadir tepat waktu' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  keterangan?: string;
}
