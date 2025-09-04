import { EnvironmentEntity } from '@novu/dal';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../commands/project.command';

export class SendWebhookMessageCommand extends EnvironmentCommand {
  @IsEnum(WebhookEventEnum)
  eventType: WebhookEventEnum;

  @IsDefined()
  @IsEnum(WebhookObjectTypeEnum)
  objectType: WebhookObjectTypeEnum;

  // todo: investigate if we can create generic type that depends on the objectType, (e.g. map objectType to WebhookMessageSentDto, WebhookMessageFailedDto, etc.)
  @IsDefined()
  payload: {
    object: Record<string, unknown>;
    previousObject?: Record<string, unknown>;
    [key: string]: Record<string, unknown> | undefined;
  };

  @IsOptional()
  environment?: EnvironmentEntity;
}
