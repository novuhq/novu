import { DirectionEnum, ResourceOriginEnum, ResourceTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { ClientSession, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { EnvironmentRepository } from '../environment';
import { NotificationTemplateDBModel, NotificationTemplateEntity } from './notification-template.entity';
import { NotificationTemplate } from './notification-template.schema';

type NotificationTemplateQuery = FilterQuery<NotificationTemplateDBModel> & EnforceEnvOrOrgIds;

export class NotificationTemplateRepository extends BaseRepository<
  NotificationTemplateDBModel,
  NotificationTemplateEntity,
  EnforceEnvOrOrgIds
> {
  private notificationTemplate: SoftDeleteModel;
  private environmentRepository = new EnvironmentRepository();

  constructor() {
    super(NotificationTemplate, NotificationTemplateEntity);
    this.notificationTemplate = NotificationTemplate;
  }

  async findPublishable(environmentId: string, organizationId: string): Promise<NotificationTemplateEntity[]> {
    const items = await this.MongooseModel.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.NOVU_CLOUD,
    })
      .select({
        _id: 1,
        name: 1,
        'triggers.identifier': 1,
        updatedAt: 1,
        _updatedBy: 1,
        _environmentId: 1,
        isTranslationEnabled: 1,
      })
      .populate('updatedBy', '_id firstName lastName externalId')
      .populate('lastPublishedBy', '_id firstName lastName externalId');

    return this.mapEntities(items);
  }

  async findByTriggerIdentifierBulk(environmentId: string, identifiers: string[], session?: ClientSession | null) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      'triggers.identifier': { $in: identifiers },
    };

    const query = this.MongooseModel.find(requestQuery, undefined, { session }).populate('steps.template');

    const items = await query;

    return this.mapEntities(items);
  }

  async findByTriggerIdentifier(environmentId: string, identifier: string, session?: ClientSession | null) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      'triggers.identifier': identifier,
    };

    const query = this.MongooseModel.findOne(requestQuery, undefined, { session })
      .populate('steps.template')
      .populate('updatedBy');

    const item = await query;

    return this.mapEntity(item);
  }

  async findAllByTriggerIdentifier(
    environmentId: string,
    identifier: string,
    session?: ClientSession | null
  ): Promise<NotificationTemplateEntity[]> {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      'triggers.identifier': identifier,
    };

    const query = await this._model.find(requestQuery, { _id: 1, 'triggers.identifier': 1 }, { session });

    return this.mapEntities(query);
  }

  async findById(id: string, environmentId: string, session?: ClientSession | null) {
    const query = this.MongooseModel.findOne(
      {
        _id: id,
        _environmentId: environmentId,
      },
      undefined,
      { session }
    )
      .populate('steps.template')
      .populate('steps.variants.template')
      .populate('updatedBy');

    const item = await query;

    return this.mapEntity(item);
  }

  async findByTriggerIdentifierAndUpdate(environmentId: string, triggerIdentifier: string, lastTriggeredAt: Date) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      'triggers.identifier': triggerIdentifier,
    };

    const item = await this.MongooseModel.findOneAndUpdate(
      requestQuery,
      {
        $set: {
          lastTriggeredAt,
        },
      },
      {
        timestamps: false,
      }
    ).populate('steps.template');

    return this.mapEntity(item);
  }

  async updatePublishFields(workflowId: string, environmentId: string, userId: string, session?: ClientSession | null) {
    const requestQuery: NotificationTemplateQuery = {
      _id: workflowId,
      _environmentId: environmentId,
    };

    const item = await this.MongooseModel.findOneAndUpdate(
      requestQuery,
      {
        $set: {
          lastPublishedAt: new Date(),
          _lastPublishedBy: userId,
        },
      },
      { session, new: true }
    );

    return this.mapEntity(item);
  }

  async findBlueprintById(id: string) {
    if (!this.blueprintOrganizationId) throw new DalException('Blueprint environment id was not found');

    const requestQuery: NotificationTemplateQuery = {
      isBlueprint: true,
      _organizationId: this.blueprintOrganizationId,
      _id: id,
    };

    const item = await this.MongooseModel.findOne(requestQuery)
      .populate('steps.template')
      .populate('notificationGroup')
      .lean();

    return this.mapEntity(item);
  }

  async findBlueprintByTriggerIdentifier(identifier: string) {
    if (!this.blueprintOrganizationId) throw new DalException('Blueprint environment id was not found');

    const requestQuery: NotificationTemplateQuery = {
      isBlueprint: true,
      _organizationId: this.blueprintOrganizationId,
      triggers: { $elemMatch: { identifier } },
    };

    const item = await this.MongooseModel.findOne(requestQuery)
      .populate('steps.template')
      .populate('notificationGroup')
      .lean();

    return this.mapEntity(item);
  }

  async findBlueprintTemplates(organizationId: string, environmentId: string): Promise<NotificationTemplateEntity[]> {
    const _organizationId = organizationId;

    if (!_organizationId) throw new DalException('Blueprint environment id was not found');

    const templates = await this.MongooseModel.find({
      isBlueprint: true,
      _environmentId: environmentId,
      _organizationId,
    })
      .populate('steps.template')
      .populate('notificationGroup')
      .lean();

    if (!templates) {
      return [];
    }

    return this.mapEntities(templates);
  }

  async findAllGroupedByCategory(): Promise<{ name: string; blueprints: NotificationTemplateEntity[] }[]> {
    const organizationId = this.blueprintOrganizationId;

    if (!organizationId) {
      return [];
    }

    const productionEnvironmentId = (
      await this.environmentRepository.findOrganizationEnvironments(organizationId)
    )?.find((env) => env.name === 'Production')?._id;

    if (!productionEnvironmentId) {
      throw new DalException(
        `Production environment id for BLUEPRINT_CREATOR ${process.env.BLUEPRINT_CREATOR} was not found`
      );
    }

    const requestQuery: NotificationTemplateQuery = {
      isBlueprint: true,
      _environmentId: productionEnvironmentId,
      _organizationId: organizationId,
    };

    const result = await this.MongooseModel.find(requestQuery)
      .populate('steps.template')
      .populate('notificationGroup')
      .lean();

    const items = result?.map((item) => this.mapEntity(item));

    const groupedItems = items.reduce((acc, item) => {
      const notificationGroupId = item._notificationGroupId;
      const notificationGroupName = item.notificationGroup?.name;

      if (!acc[notificationGroupId]) {
        acc[notificationGroupId] = {
          name: notificationGroupName,
          blueprints: [],
        };
      }

      acc[notificationGroupId].blueprints.push(item);

      return acc;
    }, {});

    return Object.values(groupedItems);
  }

  async getBlueprintList(skip = 0, limit = 10) {
    if (!this.blueprintOrganizationId) {
      return { totalCount: 0, data: [] };
    }

    const requestQuery: NotificationTemplateQuery = {
      isBlueprint: true,
      _organizationId: this.blueprintOrganizationId,
    };

    const totalItemsCount = await this.count(requestQuery);
    const items = await this.MongooseModel.find(requestQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' });

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async getList(
    organizationId: string,
    environmentId: string,
    skip: number = 0,
    limit: number = 10,
    query?: string,
    excludeNewDashboardWorkflows: boolean = false,
    orderBy: string = 'createdAt',
    orderDirection: DirectionEnum = DirectionEnum.DESC,
    tags?: string[],
    status?: string[]
  ): Promise<{ totalCount: number; data: NotificationTemplateEntity[] }> {
    const searchQuery: FilterQuery<NotificationTemplateDBModel> = {};

    if (query) {
      searchQuery.$or = [
        { name: { $regex: regExpEscape(query), $options: 'i' } },
        { 'triggers.identifier': { $regex: regExpEscape(query), $options: 'i' } },
      ];
    }

    if (excludeNewDashboardWorkflows) {
      searchQuery.$nor = [{ origin: 'novu-cloud', type: 'BRIDGE' }];
    }

    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags };
    }

    if (status && status.length > 0) {
      searchQuery.status = { $in: status };
    }

    const totalItemsCount = await this.count({
      _environmentId: environmentId,
      ...searchQuery,
    });

    const mongoQuery = this.MongooseModel.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      ...searchQuery,
    })
      .sort({ [orderBy]: orderDirection === DirectionEnum.ASC ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'notificationGroup' })
      .populate('steps.template', { type: 1 })
      .select('-steps.variants')
      .populate('updatedBy')
      .populate('lastPublishedBy', '_id firstName lastName');

    const items = await mongoQuery.lean();

    return { totalCount: totalItemsCount, data: this.mapEntities(items) };
  }

  async filterActive({
    organizationId,
    environmentId,
    tags,
    critical,
    severity,
  }: {
    organizationId: string;
    environmentId: string;
    tags?: string[];
    critical?: boolean;
    severity?: SeverityLevelEnum[];
  }) {
    const requestQuery: NotificationTemplateQuery = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      active: true,
    };

    const severityCondition: Array<FilterQuery<NotificationTemplateDBModel>> = [];
    if (severity && severity?.length > 0) {
      if (severity.includes(SeverityLevelEnum.NONE)) {
        severityCondition.push({ severity: { $exists: false } }, { severity: { $in: severity } });
      } else {
        requestQuery.severity = { $in: severity };
      }
    }

    if (tags && tags?.length > 0) {
      requestQuery.tags = { $in: tags };
    }

    if (critical !== undefined) {
      requestQuery.critical = { $eq: critical };
    }

    // combine all $or conditions properly
    const orConditions: Array<FilterQuery<NotificationTemplateDBModel>> = [];
    if (severityCondition.length > 0) {
      orConditions.push({ $or: severityCondition });
    }
    if (orConditions.length > 0) {
      requestQuery.$and = [...(requestQuery.$and ?? []), ...orConditions];
    }

    const items = await this.MongooseModel.find(requestQuery)
      .populate('steps.template', { type: 1 })
      .populate('notificationGroup')
      .limit(500) // protective limit
      .read('secondaryPreferred');

    return this.mapEntities(items);
  }

  async delete(query: NotificationTemplateQuery) {
    return await this.notificationTemplate.delete({ _id: query._id, _environmentId: query._environmentId });
  }

  async findDeleted(query: NotificationTemplateQuery): Promise<NotificationTemplateEntity> {
    const res: NotificationTemplateEntity = await this.notificationTemplate.findDeleted(query);

    return this.mapEntity(res);
  }

  private get blueprintOrganizationId(): string | undefined {
    return NotificationTemplateRepository.getBlueprintOrganizationId();
  }

  public static getBlueprintOrganizationId(): string | undefined {
    return process.env.BLUEPRINT_CREATOR;
  }

  async estimatedDocumentCount(): Promise<any> {
    return this.notificationTemplate.estimatedDocumentCount();
  }

  async getTotalSteps(): Promise<number> {
    const res = await this.notificationTemplate.aggregate<{ totalSteps: number }>([
      {
        $group: {
          _id: null,
          totalSteps: {
            $sum: {
              $cond: {
                if: { $isArray: '$steps' },
                then: { $size: '$steps' },
                else: 0,
              },
            },
          },
        },
      },
    ]);
    if (res.length > 0) {
      return res[0].totalSteps;
    } else {
      return 0;
    }
  }

  async findWithTemplates(query: NotificationTemplateQuery): Promise<NotificationTemplateEntity[]> {
    const items = await this.MongooseModel.find(query)
      .populate('steps.template')
      .populate('steps.variants.template')
      .populate('updatedBy')
      .lean();

    return this.mapEntities(items);
  }
}

function regExpEscape(literalString: string): string {
  return literalString.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&');
}
