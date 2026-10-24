import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  waktu?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  keterangan?: string;
}
