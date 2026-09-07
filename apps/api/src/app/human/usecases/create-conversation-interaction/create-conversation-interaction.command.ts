import { ConversationChannel, ConversationEntity } from '@novu/dal';
import { HumanInteractionKindEnum } from '@novu/shared';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsValidHumanTo } from '../../validators/is-valid-human-to';

export class CreateConversationInteractionCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  conversation: ConversationEntity;

  @IsNotEmpty()
  channel: ConversationChannel;

  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsInt()
  ttlSeconds?: number;

  @IsOptional()
  @Validate(IsValidHumanTo)
  to?: string | string[];
}
