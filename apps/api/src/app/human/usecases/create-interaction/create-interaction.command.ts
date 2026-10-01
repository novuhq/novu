import { HumanChannelViaEnum, HumanInteractionKindEnum } from '@novu/shared';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Validate } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsValidHumanTo } from '../../validators/is-valid-human-to';
import type { HumanInteractionCardInput } from '../create-conversation-interaction/create-conversation-interaction.command';

export class CreateInteractionCommand extends EnvironmentWithUserCommand {
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @IsObject()
  card: HumanInteractionCardInput;

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
