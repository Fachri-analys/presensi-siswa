import { IsDateString, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSickLetterDto {
  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal harus YYYY-MM-DD.' })
  date!: string;

  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty({ message: 'ID Kelas wajib diisi.' })
  kelasId!: string;

  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  @IsNotEmpty({ message: 'ID Siswa wajib diisi.' })
  studentId!: string;

  @ApiProperty({ example: 'Sakit demam surat dokter' })
  @IsString()
  @IsNotEmpty({ message: 'Keterangan sakit wajib diisi.' })
  @MinLength(3, { message: 'Keterangan sakit minimal 3 karakter.' })
  @MaxLength(255, { message: 'Keterangan sakit maksimal 255 karakter.' })
  keterangan!: string;
}
