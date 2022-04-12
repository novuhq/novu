import { BaseRepository } from '../base-repository';
import { NotificationTemplate } from './notification-template.schema';
import { NotificationTemplateEntity } from './notification-template.entity';

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplateEntity> {
  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
  }

  async findByTriggerIdentifier(applicationId: string, identifier: string) {
    const item = await NotificationTemplate.findOne({
      _applicationId: applicationId,
      'triggers.identifier': identifier,
    }).populate('steps.template');

    return this.mapEntity(item);
  }

  async findById(id: string, organizationId: string) {
    const item = await NotificationTemplate.findOne({
      _id: id,
      _organizationId: organizationId,
    }).populate('steps.template');

    return this.mapEntity(item);
  }

  async getList(organizationId: string, environmentId: string) {
    const items = await NotificationTemplate.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
    }).populate('notificationGroup');

    return this.mapEntities(items);
  }
}
