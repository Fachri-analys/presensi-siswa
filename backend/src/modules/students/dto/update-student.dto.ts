import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '@prisma/client';

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: '241101' })
  @IsString()
  @IsOptional()
  nis?: string;

  @ApiPropertyOptional({ example: 'Ahmad Fauzi' })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ example: 'class_id_123' })
  @IsString()
  @IsOptional()
  kelasId?: string;

  @ApiPropertyOptional({ enum: ActiveStatus, example: ActiveStatus.active })
  @IsEnum(ActiveStatus)
  @IsOptional()
  status?: ActiveStatus;
}
