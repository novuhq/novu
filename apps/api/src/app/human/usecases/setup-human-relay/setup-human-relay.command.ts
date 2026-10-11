import { HumanChannelViaEnum } from '@novu/shared';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetupHumanRelayCommand extends EnvironmentWithUserCommand {
  /** Only optional for the operator, who gets the stored subscriberId or a new one. */
  @ValidateIf((command: SetupHumanRelayCommand) => !command.operator || command.subscriberId !== undefined)
  @IsString()
  @IsNotEmpty()
  subscriberId?: string;

  @IsOptional()
  @IsBoolean()
  operator?: boolean;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  /** What the relay agent is called. Missing leaves the name it has, or the default for a new one. */
  @IsOptional()
  @IsString()
  agentName?: string;

  @IsOptional()
  @IsString()
  agentDescription?: string;

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
}
