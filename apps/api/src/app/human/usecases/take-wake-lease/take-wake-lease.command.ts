import { WAKE_HOST_IDS, type WakeHostId } from '@novu/dal';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  WAKE_COMPUTER_ID_PATTERN,
  WAKE_COMPUTER_NAME_MAX_LENGTH,
  WAKE_PROJECT_MAX_LENGTH,
} from '../../dtos/human-wake.dto';

export class TakeWakeLeaseCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @Matches(WAKE_COMPUTER_ID_PATTERN)
  computerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(WAKE_COMPUTER_NAME_MAX_LENGTH)
  computerName: string;

  @IsIn(WAKE_HOST_IDS)
  host: WakeHostId;

  @IsOptional()
  @IsString()
  @MaxLength(WAKE_PROJECT_MAX_LENGTH)
  project?: string;

  @IsOptional()
  @IsBoolean()
  takeOver?: boolean;
}
