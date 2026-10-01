import { HumanChannelViaEnum } from '@novu/shared';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetupHumanRelayCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(HumanChannelViaEnum)
  defaultVia?: HumanChannelViaEnum;

  /** Caller is the relay owner (`human setup`), not an invitee being provisioned. */
  @IsOptional()
  @IsBoolean()
  operator?: boolean;
}
