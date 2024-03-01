import { InstrumentUsecase } from '@novu/application-generic';
import { ApiException } from '../../shared/exceptions/api.exception';
import { CreateWebhookCommand, SpecificWebhookCommand, UpdateWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';
import { GenID } from './gen-id.usecase';

export class CreateWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository, private genId: GenID) {}

  @InstrumentUsecase()
  async execute(command: CreateWebhookCommand) {
    return await this.webhookRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _templateId: command.environmentId,
      _creatorId: 'API',
      name: command.name,
      description: command.description,
      active: command.active ?? false,
      variables: command.variables ?? [],
      token: this.genId.execute(
        SpecificWebhookCommand.create({
          webhookId: command.webhookId,
        })
      ),
      subscribers: command.subscribers,
    });
  }
}
