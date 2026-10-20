import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AGENT_HANDLE_MAX_LENGTH, AGENT_HANDLE_PATTERN } from '../../services/human-connect-code.service';

export class CreateConnectCodeCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @Matches(AGENT_HANDLE_PATTERN)
  @MaxLength(AGENT_HANDLE_MAX_LENGTH)
  handle: string;
}
