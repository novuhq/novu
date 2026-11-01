import { LISTEN_HOST_IDS, type ListenHostId } from '@novu/dal';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { LISTEN_COMPUTER_ID_PATTERN } from '../../dtos/human-listen.dto';

export class ReleaseListenLeaseCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @Matches(LISTEN_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsIn(LISTEN_HOST_IDS)
  host: ListenHostId;
}
