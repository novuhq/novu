import { WebhookResponseDto } from '../dtos/webhook-responce.dto';
import { WebhookTriggerEntity } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.entity';

export function convertToDTO(entity: WebhookTriggerEntity): WebhookResponseDto {
  return {
    webhookId: entity.token,
    environmentId: entity._environmentId,
    organizationId: entity._organizationId,
    templateId: entity._templateId,
    name: entity.name,
    description: entity.description,
    active: entity.active,
    variables: entity.variables,
    subscribers: entity.subscribers,
  } as WebhookResponseDto;
}
