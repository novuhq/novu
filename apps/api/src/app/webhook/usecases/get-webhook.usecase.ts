import { InstrumentUsecase } from '@novu/application-generic';
import { SpecificWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { convertToDTO } from './convert-responce.usecase';

export class GetWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository) {}

  @InstrumentUsecase()
  async execute(command: SpecificWebhookCommand) {
    const webhook = await this.webhookRepository.findOne({
      _id: command.webhookId,
    });

    if (webhook) {
      return convertToDTO(webhook);
    }

    return webhook;
  }
}
