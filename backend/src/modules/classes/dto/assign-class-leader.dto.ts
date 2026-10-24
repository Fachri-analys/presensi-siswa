import { IsOptional, IsString, MinLength } from 'class-validator';

export class AssignClassLeaderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  leaderUserId!: string | null;
}
