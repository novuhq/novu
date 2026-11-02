import { IsBoolean, IsDefined, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class VoiceTurnCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  identifier: string;

  @IsOptional()
  @IsString()
  say?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsIn(['approve', 'deny'])
  decision?: 'approve' | 'deny';

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsBoolean()
  hangup?: boolean;

  /** How long this turn listens, in seconds. Capped at the server's own bound. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(25)
  waitSeconds?: number;
}
