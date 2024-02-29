import { InstrumentUsecase } from '@novu/application-generic';
import { ApiException } from '../../shared/exceptions/api.exception';
import { CreateWebhookCommand, UpdateWebhookCommand } from '../dtos/webhook-request.dto';
import { WebhookTriggerRepository } from '@novu/dal/src/repositories/webhook-trigger/webhook-trigger.repository';

export class CreateWebhook {
  constructor(private webhookRepository: WebhookTriggerRepository) {}

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
    });
  }
}
