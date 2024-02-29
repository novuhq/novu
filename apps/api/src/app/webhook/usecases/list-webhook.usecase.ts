import { InstrumentUsecase } from '@novu/application-generic';
import { ListWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { WebhookResponseDto } from '../dtos/webhook-responce.dto';
import { WebhookTriggerEntity } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.entity';
import { convertToDTO } from './convert-responce.usecase';

export class ListWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository) {}

  @InstrumentUsecase()
  async execute(command: ListWebhookCommand): Promise<WebhookResponseDto[]> {
    // const whReturn: WebhookResponseDto;
    let webhooks: WebhookTriggerEntity[];

    if (command.notificationTemplateId) {
      webhooks = await this.webhookRepository.getWebhooksPerNotificationTemplate(
        command.environmentId,
        command.notificationTemplateId
      );
    } else {
      webhooks = await this.webhookRepository.getWebhooksPerEnv(command.environmentId);
    }

    return webhooks.map((wh) => convertToDTO(wh));
  }
}
