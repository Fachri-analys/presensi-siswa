import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus } from '@prisma/client';

export class UpdateClassDto {
  @ApiPropertyOptional({ example: 'X PPLG 1' })
  @IsString()
  @IsOptional()
  nama?: string;

  @ApiPropertyOptional({ example: 'Pengembangan Perangkat Lunak dan Gim' })
  @IsString()
  @IsOptional()
  jurusan?: string;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsEnum(ActiveStatus)
  @IsOptional()
  status?: ActiveStatus;
}
