import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAttendanceDto {
  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  date!: string;
}

export class QueryHistoryDto {
  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-10-16' })
  @IsDateString()
  to!: string;
}

export class QueryRecapDto {
  @ApiProperty({ example: 'class_id_123' })
  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
