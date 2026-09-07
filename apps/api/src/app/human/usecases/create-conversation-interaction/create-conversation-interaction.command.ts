import { ConversationChannel, ConversationEntity } from '@novu/dal';
import { HumanInteractionKindEnum, type HumanOptionInput } from '@novu/shared';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Validate } from 'class-validator';
import type { SlackNativeDelivery } from '../../../agents/conversation-runtime/egress/slack-native-delivery';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsValidHumanTo } from '../../validators/is-valid-human-to';

/** Chrome presentation or a posted Card element from `{ render }` / the Chat SDK. */
export type HumanInteractionCardInput =
  | {
      type: 'card';
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      children?: unknown[];
    }
  | {
      title?: string;
      icon?: string;
      subtitle?: string;
      body?: string;
      approveLabel?: string;
      denyLabel?: string;
      extraActions?: HumanOptionInput[];
      options?: HumanOptionInput[];
    };

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
  requestId: string;

  @IsNotEmpty()
  @IsObject()
  card: HumanInteractionCardInput;

  @IsOptional()
  @IsBoolean()
  skipDelivery?: boolean;

  @IsOptional()
  @IsObject()
  slackNative?: SlackNativeDelivery;

  @IsOptional()
  @IsString()
  agentName?: string;

  /**
   * When set, pending chrome buttons use `human:{actionIdentifier}:…`
   * (`requestId` for `renderApprove`). Omitted = public `hi_…` identifier.
   */
  @IsOptional()
  @IsString()
  actionIdentifier?: string;

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
