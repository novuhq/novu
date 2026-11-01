import { LISTEN_HOST_IDS, type ListenHostId } from '@novu/dal';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  LISTEN_COMPUTER_ID_PATTERN,
  LISTEN_COMPUTER_NAME_MAX_LENGTH,
  LISTEN_PROJECT_MAX_LENGTH,
} from '../../dtos/human-listen.dto';

export class TakeListenLeaseCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @Matches(LISTEN_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(LISTEN_COMPUTER_NAME_MAX_LENGTH)
  computerName: string;

  @IsIn(LISTEN_HOST_IDS)
  host: ListenHostId;

  @IsOptional()
  @IsString()
  @MaxLength(LISTEN_PROJECT_MAX_LENGTH)
  project?: string;

  @IsOptional()
  @IsBoolean()
  takeOver?: boolean;
}
