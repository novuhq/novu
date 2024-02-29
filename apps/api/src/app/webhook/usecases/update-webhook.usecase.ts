import { InstrumentUsecase } from '@novu/application-generic';
import { ApiException } from '../../shared/exceptions/api.exception';
import { UpdateWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { convertToDTO } from './convert-responce.usecase';

export class UpdateWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository) {}

  @InstrumentUsecase()
  async execute(command: UpdateWebhookCommand) {
    const webhook = await this.webhookRepository.findOne({
      token: command.webhookId,
    });

    if (!webhook) {
      throw new ApiException('Webhook not found', 'WEBHOOK_NOT_FOUND');
    }

    await this.webhookRepository.update(
      {
        token: command.webhookId,
      },
      {
        name: command.name ?? webhook.name,
        description: command.description ?? webhook.description,
        active: command.active ?? webhook.active,
        variables: command.variables ?? webhook.variables,
      }
    );
  }
}
