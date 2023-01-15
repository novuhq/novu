import { Document, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { BaseRepository, Omit } from '../base-repository';
import { NotificationTemplate } from './notification-template.schema';
import { NotificationTemplateEntity } from './notification-template.entity';
import { DalException } from '../../shared';

class PartialNotificationTemplateEntity extends Omit(NotificationTemplateEntity, [
  '_environmentId',
  '_organizationId',
]) {}

type EnforceEnvironmentQuery = FilterQuery<PartialNotificationTemplateEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class NotificationTemplateRepository extends BaseRepository<
  EnforceEnvironmentQuery,
  NotificationTemplateEntity
> {
  private notificationTemplate: SoftDeleteModel;
  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
    this.notificationTemplate = NotificationTemplate;
  }

  async findByTriggerIdentifier(environmentId: string, identifier: string) {
    const requestQuery: EnforceEnvironmentQuery = {
      _environmentId: environmentId,
      'triggers.identifier': identifier,
    };

    const item = await NotificationTemplate.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async findById(id: string, environmentId: string) {
    const requestQuery: EnforceEnvironmentQuery = {
      _id: id,
      _environmentId: environmentId,
    };

    const item = await NotificationTemplate.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async findBlueprint(id: string) {
    const requestQuery: EnforceEnvironmentQuery = {
      _id: id,
      isBlueprint: true,
      _organizationId: NotificationTemplateRepository.getBlueprintOrganizationId(),
    };

    const item = await NotificationTemplate.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async getBlueprintList(skip = 0, limit = 10) {
    const requestQuery: EnforceEnvironmentQuery = {
      isBlueprint: true,
      _organizationId: NotificationTemplateRepository.getBlueprintOrganizationId(),
    };

    const totalItemsCount = await this.count(requestQuery);
    const items = await NotificationTemplate.find(requestQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' });

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async getList(organizationId: string, environmentId: string, skip = 0, limit = 10) {
    const totalItemsCount = await this.count({ _environmentId: environmentId });

    const requestQuery: EnforceEnvironmentQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    const items = await NotificationTemplate.find(requestQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' });

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async getActiveList(organizationId: string, environmentId: string, active?: boolean) {
    const requestQuery: EnforceEnvironmentQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      active: active,
    };

    const items = await NotificationTemplate.find(requestQuery).populate('notificationGroup');

    return this.mapEntities(items);
  }

  async delete(query: EnforceEnvironmentQuery) {
    const item = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!item) throw new DalException(`Could not find notification template with id ${query._id}`);
    await this.notificationTemplate.delete({ _id: item._id, _environmentId: item._environmentId });
  }

  async findDeleted(query: EnforceEnvironmentQuery): Promise<NotificationTemplateEntity> {
    const res = await this.notificationTemplate.findDeleted(query);

    return this.mapEntity(res);
  }

  public static getBlueprintOrganizationId(): string {
    return process.env.BLUEPRINT_CREATOR;
  }
}
