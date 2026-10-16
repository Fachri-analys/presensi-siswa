import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
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
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records!: AttendanceItemDto[];
}
