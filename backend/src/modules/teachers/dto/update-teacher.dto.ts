import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '@prisma/client';

export class UpdateTeacherDto {
  @ApiPropertyOptional({ example: '198001012006041001' })
  @IsString()
  @IsOptional()
  nip?: string;

  @ApiPropertyOptional({ example: 'Drs. Budi Santoso' })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  @IsOptional()
  status?: ActiveStatus;
}
