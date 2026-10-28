import { IsBoolean, IsDefined, IsIn, IsOptional, IsString } from 'class-validator';
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
}
