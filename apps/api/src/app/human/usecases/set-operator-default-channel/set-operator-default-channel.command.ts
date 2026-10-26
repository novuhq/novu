import { HumanChannelViaEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetOperatorDefaultChannelCommand extends EnvironmentWithUserCommand {
  @IsEnum(HumanChannelViaEnum)
  via: HumanChannelViaEnum;

  /** Relay agent whose operator this is. Defaults to `human-relay`. */
  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
