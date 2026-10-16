import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: '241101' })
  @IsString()
  @IsNotEmpty()
  nis!: string;

  @ApiProperty({ example: 'Ahmad Fauzi' })
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;
}
