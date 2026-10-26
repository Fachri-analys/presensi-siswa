import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceItemDto } from './attendance-item.dto';

export class BatchAttendanceDto {
  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records!: AttendanceItemDto[];

  @ApiProperty({ required: false, description: 'Ganti seluruh presensi kelas/tanggal dengan daftar ini.' })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}
