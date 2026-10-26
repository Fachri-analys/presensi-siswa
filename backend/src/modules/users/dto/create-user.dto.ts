import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MaxUtf8Bytes } from '../../../common/validators/max-utf8-bytes.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Guru Piket 1' })
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @ApiProperty({ example: 'guru@sekolah.sch.id' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: Role, example: Role.GURU_PIKET })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  kelasId?: string | null;

  @ApiProperty({ example: 'SandiAwalYangPanjang!' })
  @IsString()
  @MinLength(12)
  @MaxUtf8Bytes(72)
  password!: string;
}
