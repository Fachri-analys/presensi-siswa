import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSickLetterDto {
  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ example: 'Sakit demam surat dokter' })
  @IsString()
  @IsNotEmpty()
  keterangan!: string;
}
