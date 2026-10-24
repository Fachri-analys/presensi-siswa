import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateAttendancePermissionDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  kelasId!: string;

  @IsString()
  @IsNotEmpty()
  nis!: string;
}
