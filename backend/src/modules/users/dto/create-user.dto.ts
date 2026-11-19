import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MaxUtf8Bytes } from '../../../common/validators/max-utf8-bytes.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'Guru Piket 1' })
  @IsString()
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi.' })
  @MinLength(2, { message: 'Nama lengkap minimal 2 karakter.' })
  @MaxLength(100, { message: 'Nama lengkap maksimal 100 karakter.' })
  @Matches(/^[a-zA-Z0-9\s.,'’\-]+$/, {
    message: 'Nama hanya boleh memuat huruf, angka, spasi, dan tanda baca umum.',
  })
  nama!: string;

  @ApiProperty({ example: 'guru@sekolah.sch.id' })
  @IsEmail({}, { message: 'Format alamat email tidak valid.' })
  @MaxLength(254, { message: 'Email maksimal 254 karakter.' })
  email!: string;

  @ApiProperty({ enum: Role, example: Role.GURU_PIKET })
  @IsEnum(Role, { message: 'Role tidak valid.' })
  role!: Role;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  kelasId?: string | null;

  @ApiProperty({ example: 'SandiAwalYangPanjang1!' })
  @IsString()
  @MinLength(12, { message: 'Kata sandi minimal 12 karakter.' })
  @MaxUtf8Bytes(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).+$/, {
    message: 'Kata sandi harus memadukan huruf besar, huruf kecil, dan angka/simbol.',
  })
  password!: string;
}
