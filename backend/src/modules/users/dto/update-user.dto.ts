import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus, Role } from '@prisma/client';
import { MaxUtf8Bytes } from '../../../common/validators/max-utf8-bytes.decorator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Guru Piket 1 Updated' })
  @IsOptional()
  @IsString()
  nama?: string;

  @ApiPropertyOptional({ example: 'guru.baru@sekolah.sch.id' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  kelasId?: string | null;

  @ApiPropertyOptional({ example: 'NewSecret123!' })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxUtf8Bytes(72)
  password?: string;
}
