import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
  waktu?: string | null;

  @ApiPropertyOptional({ example: 'Hadir tepat waktu' })
  @IsString()
  @IsOptional()
  keterangan?: string;
}
