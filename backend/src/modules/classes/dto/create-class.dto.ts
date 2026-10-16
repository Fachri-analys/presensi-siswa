import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'X PPLG 1' })
  @IsString()
  @IsNotEmpty()
  nama!: string;

  @ApiProperty({ example: 'Pengembangan Perangkat Lunak dan Gim' })
  @IsString()
  @IsNotEmpty()
  jurusan!: string;
}
