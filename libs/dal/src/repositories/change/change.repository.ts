import { ChangeEntityTypeEnum } from '@novu/shared';

import { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { ChangeEntity, ChangeDBModel } from './change.entity';
import { Change } from './change.schema';
import { UserEntity } from '../user';
import { ChangeEntityPopulated } from './types';

export class ChangeRepository extends BaseRepository<ChangeDBModel, ChangeEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Change, ChangeEntity);
  }

  public async getEntityChanges(
    organizationId: string,
    entityType: ChangeEntityTypeEnum,
    entityId: string
  ): Promise<ChangeEntity[]> {
    return await this.find(
      {
        _organizationId: organizationId,
        _entityId: entityId,
        type: entityType,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );
  }

  public async getChangeId(environmentId: string, entityType: ChangeEntityTypeEnum, entityId: string): Promise<string> {
    const change = await this.findOne({
      _environmentId: environmentId,
      _entityId: entityId,
      type: entityType,
      enabled: false,
    });

    if (change?._id) {
      return change._id;
    }

    return BaseRepository.createObjectId();
  }

  public async getList(organizationId: string, environmentId: string, enabled: boolean, skip = 0, limit = 10) {
    const totalItemsCount = await this.count({
      _environmentId: environmentId,
      _organizationId: organizationId,
      enabled,
      _parentId: { $exists: false, $eq: null },
    });

    const userSelect: Array<keyof UserEntity> = ['_id', 'firstName', 'lastName', 'profilePicture'];

    const items = await this.MongooseModel.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      enabled,
      _parentId: { $exists: false, $eq: null },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', userSelect);

    return { totalCount: totalItemsCount, data: this.mapEntities(items) as ChangeEntityPopulated[] };
  }

  public async getParentId(
    environmentId: string,
    entityType: ChangeEntityTypeEnum,
    entityId: string
  ): Promise<string | null> {
    const change = await this.findOne(
      {
        _environmentId: environmentId,
        _entityId: entityId,
        type: entityType,
        enabled: false,
        _parentId: { $exists: true },
      },
      '_parentId'
    );
    if (change?._parentId) {
      return change._parentId;
    }

    return null;
  }
}
