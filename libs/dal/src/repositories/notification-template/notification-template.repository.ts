import { Document, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository } from '../base-repository';
import { NotificationTemplate } from './notification-template.schema';
import { NotificationTemplateEntity } from './notification-template.entity';
import { DalException } from '../../shared';

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplateEntity> {
  private notifcationTemplate: SoftDeleteModel;
  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
    this.notifcationTemplate = NotificationTemplate;
  }

  async findByTriggerIdentifier(environmentId: string, identifier: string) {
    const item = await NotificationTemplate.findOne({
      _environmentId: environmentId,
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

  async delete(query: FilterQuery<NotificationTemplateEntity & Document>) {
    const item = await this.findOne({ _id: query._id });
    if (!item) throw new DalException(`Could not find notification template with id ${query._id}`);
    await this.notifcationTemplate.delete({ _id: item._id, _environmentId: item._environmentId });
  }

  async findDeleted(query: FilterQuery<NotificationTemplateEntity & Document>): Promise<NotificationTemplateEntity> {
    const res = await this.notifcationTemplate.findDeleted(query);

    return this.mapEntity(res);
  }
}
