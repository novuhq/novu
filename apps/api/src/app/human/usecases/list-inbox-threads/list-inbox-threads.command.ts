import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { HUMAN_INBOX_MAX_WAIT_SECONDS } from '../../dtos/human-inbox.dto';

export class ListInboxThreadsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  includeResolved?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(HUMAN_INBOX_MAX_WAIT_SECONDS)
  waitSeconds?: number;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
