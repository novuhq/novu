import { InstrumentUsecase } from '@novu/application-generic';
import { SpecificWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { createId } from '@paralleldrive/cuid2';

export class GenID {
  constructor(private webhookRepository: WebhookTriggerRepository) {}

  @InstrumentUsecase()
  async execute(command: SpecificWebhookCommand) {
    let newID = '';
    let idCount = 0;

    do {
      newID = 'wh-' + createId();
      idCount = await this.webhookRepository.count({
        _id: command.webhookId,
      });
    } while (idCount != 0);

    return newID;
  }
}
