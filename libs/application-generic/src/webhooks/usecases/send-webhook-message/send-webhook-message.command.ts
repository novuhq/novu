import { IsDefined, IsString, IsEnum } from 'class-validator';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../commands/project.command';

export class SendWebhookMessageCommand extends EnvironmentCommand {
  @IsEnum(WebhookEventEnum)
  eventType: WebhookEventEnum;

  @IsDefined()
  @IsEnum(WebhookObjectTypeEnum)
  objectType: WebhookObjectTypeEnum;

  @IsDefined()
  payload: {
    object: Record<string, unknown>;
    previousObject?: Record<string, unknown>;
    [key: string]: Record<string, unknown> | undefined;
  };
}
