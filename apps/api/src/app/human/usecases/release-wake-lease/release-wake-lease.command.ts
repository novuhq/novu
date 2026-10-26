import { WAKE_HOST_IDS, type WakeHostId } from '@novu/dal';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { WAKE_COMPUTER_ID_PATTERN } from '../../dtos/human-wake.dto';

export class ReleaseWakeLeaseCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @Matches(WAKE_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsIn(WAKE_HOST_IDS)
  host: WakeHostId;
}
