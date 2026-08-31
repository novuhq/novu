import { HumanChannelViaEnum, HumanInteractionKindEnum } from '@novu/shared';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsValidHumanTo } from '../../validators/is-valid-human-to';

export class CreateInteractionCommand extends EnvironmentWithUserCommand {
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @Validate(IsValidHumanTo)
  to: string | string[];

  @IsOptional()
  @IsEnum(HumanChannelViaEnum)
  via?: HumanChannelViaEnum;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsInt()
  ttlSeconds?: number;
}
