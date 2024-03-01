import { InstrumentUsecase } from '@novu/application-generic';
import { SpecificWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { GenID } from './gen-id.usecase';

export class RegenWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository, private genId: GenID) {}

  @InstrumentUsecase()
  async execute(command: SpecificWebhookCommand) {
    const webhook = await this.webhookRepository.findOne({
      _id: command.webhookId,
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return await this.webhookRepository.update(
      {
        _id: command.webhookId,
      },
      {
        token: this.genId.execute(
          SpecificWebhookCommand.create({
            webhookId: command.webhookId,
          })
        ),
      }
    );
  }
}
