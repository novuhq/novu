import { BaseRepository } from '../base-repository';
import { WebhookTriggerDBModel, WebhookTriggerEntity } from './webhook-trigger.entity';
import { WebhookTrigger } from './webhook-trigger.schema';
import { SoftDeleteModel } from 'mongoose-delete';

export class WebhookTriggerRepository extends BaseRepository<WebhookTriggerDBModel, WebhookTriggerEntity, object> {
  private webhookTrigger: SoftDeleteModel;
  constructor() {
    super(WebhookTrigger, WebhookTriggerEntity);
    this.webhookTrigger = WebhookTrigger;
  }

  async getWebhooksPerNotificationTemplate(environmentId: string, notificationTemplateId: string) {
    const webhookTriggers = await this._model.find({
      _templateId: notificationTemplateId,
      _environmentId: environmentId,
    });

    return webhookTriggers.map((trigger) => this.mapEntity(trigger));
  }

  async getWebhooksPerEnv(environmentId: string) {
    const webhookTriggers = await this._model.find({ _environmentId: environmentId });

    return webhookTriggers.map((trigger) => this.mapEntity(trigger));
  }
}
