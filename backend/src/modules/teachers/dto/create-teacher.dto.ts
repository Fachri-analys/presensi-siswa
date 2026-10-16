import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({ example: '198001012006041001' })
  @IsString()
  @IsNotEmpty()
  nip!: string;

  @ApiProperty({ example: 'Drs. Budi Santoso' })
  @IsString()
  @IsNotEmpty()
  nama!: string;
}
