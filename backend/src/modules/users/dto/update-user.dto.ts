import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActiveStatus, Role } from '@prisma/client';
import { MaxUtf8Bytes } from '../../../common/validators/max-utf8-bytes.decorator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Guru Piket 1 Updated' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama lengkap minimal 2 karakter.' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter.' })
  @Matches(/^[a-zA-Z0-9\s.,'’\-]+$/, {
    message: 'Nama hanya boleh memuat huruf, angka, spasi, dan tanda baca umum.',
  })
  nama?: string;

  @ApiPropertyOptional({ example: 'guru.baru@sekolah.sch.id' })
  @IsOptional()
  @IsEmail({}, { message: 'Format alamat email tidak valid.' })
  @MaxLength(254, { message: 'Email maksimal 254 karakter.' })
  email?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Role tidak valid.' })
  role?: Role;

  @ApiPropertyOptional({ enum: ActiveStatus })
  @IsOptional()
  @IsEnum(ActiveStatus, { message: 'Status tidak valid.' })
  status?: ActiveStatus;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  kelasId?: string | null;

  @ApiPropertyOptional({ example: 'NewSecret123!' })
  @IsOptional()
  @IsString()
  @MinLength(12, { message: 'Kata sandi minimal 12 karakter.' })
  @MaxUtf8Bytes(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).+$/, {
    message: 'Kata sandi harus memadukan huruf besar, huruf kecil, dan angka/simbol.',
  })
  password?: string;
}
