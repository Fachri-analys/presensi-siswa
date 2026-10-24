import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format mulai harus HH:MM yang valid' })
  mulai?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format selesai harus HH:MM yang valid' })
  selesai?: string;

  @IsOptional()
  @IsBoolean()
  terkunci?: boolean;
}
