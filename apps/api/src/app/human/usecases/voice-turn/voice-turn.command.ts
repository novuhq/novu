import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class VoiceTurnCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  identifier: string;

  @IsString()
  @IsDefined()
  line: string;

  @IsOptional()
  @IsBoolean()
  hangup?: boolean;
}
