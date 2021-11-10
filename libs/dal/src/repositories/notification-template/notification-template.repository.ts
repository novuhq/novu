import { BaseRepository } from '../base-repository';
import { NotificationTemplate } from './notification-template.schema';
import { NotificationTemplateEntity } from './notification-template.entity';

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplateEntity> {
  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
  }

  async findByTriggerIdentifier(organizationId: string, identifier: string) {
    const item = await NotificationTemplate.findOne({
      _organizationId: organizationId,
      'triggers.identifier': identifier,
    }).populate('messages.template');

    return this.mapEntity(item);
  }

  async findById(id: string, organizationId: string) {
    const item = await NotificationTemplate.findOne({
      _id: id,
      _organizationId: organizationId,
    }).populate('messages.template');

    return this.mapEntity(item);
  }

  async getList(organizationId: string, applicationId: string) {
    const items = await NotificationTemplate.find({
      _applicationId: applicationId,
      _organizationId: organizationId,
    }).populate('notificationGroup');

    return this.mapEntities(items);
  }
}
