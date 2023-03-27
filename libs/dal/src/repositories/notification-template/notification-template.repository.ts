import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

import { BaseRepository } from '../base-repository';
import { NotificationTemplate } from './notification-template.schema';
import { NotificationTemplateEntity, NotificationTemplateDBModel } from './notification-template.entity';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

type NotificationTemplateQuery = FilterQuery<NotificationTemplateDBModel> & EnforceEnvOrOrgIds;

export class NotificationTemplateRepository extends BaseRepository<
  NotificationTemplateDBModel,
  NotificationTemplateEntity,
  EnforceEnvOrOrgIds
> {
  private notificationTemplate: SoftDeleteModel;
  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
    this.notificationTemplate = NotificationTemplate;
  }

  async findByTriggerIdentifier(environmentId: string, identifier: string) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      'triggers.identifier': identifier,
    };

    const item = await this.MongooseModel.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async findById(id: string, environmentId: string) {
    const requestQuery: NotificationTemplateQuery = {
      _id: id,
      _environmentId: environmentId,
    };

    const item = await this.MongooseModel.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async findBlueprint(id: string) {
    const requestQuery: NotificationTemplateQuery = {
      _id: id,
      isBlueprint: true,
      _organizationId: NotificationTemplateRepository.getBlueprintOrganizationId() as string,
    };

    const item = await this.MongooseModel.findOne(requestQuery).populate('steps.template');

    return this.mapEntity(item);
  }

  async getBlueprintList(skip = 0, limit = 10) {
    if (!NotificationTemplateRepository.getBlueprintOrganizationId()) {
      return { totalCount: 0, data: [] };
    }

    const requestQuery: NotificationTemplateQuery = {
      isBlueprint: true,
      _organizationId: NotificationTemplateRepository.getBlueprintOrganizationId() as string,
    };

    const totalItemsCount = await this.count(requestQuery);
    const items = await this.MongooseModel.find(requestQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' });

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async getList(organizationId: string, environmentId: string, skip = 0, limit = 10) {
    const totalItemsCount = await this.count({ _environmentId: environmentId });

    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    const items = await this.MongooseModel.find(requestQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' });

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async getActiveList(organizationId: string, environmentId: string, active?: boolean) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      active: active,
    };

    const items = await this.MongooseModel.find(requestQuery).populate('notificationGroup');

    return this.mapEntities(items);
  }

  async delete(query: NotificationTemplateQuery) {
    const item = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!item) throw new DalException(`Could not find notification template with id ${query._id}`);
    await this.notificationTemplate.delete({ _id: item._id, _environmentId: item._environmentId });
  }

  async findDeleted(query: NotificationTemplateQuery): Promise<NotificationTemplateEntity> {
    const res: NotificationTemplateEntity = await this.notificationTemplate.findDeleted(query);

    return this.mapEntity(res);
  }

  public static getBlueprintOrganizationId(): string | undefined {
    return process.env.BLUEPRINT_CREATOR;
  }
}
