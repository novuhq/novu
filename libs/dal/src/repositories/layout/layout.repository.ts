import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';

import { LayoutEntity } from './layout.entity';
import { Layout } from './layout.schema';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, LayoutId, LayoutName } from './types';

import { BaseRepository, Omit } from '../base-repository';
import { DalException } from '../../shared';

class PartialIntegrationEntity extends Omit(LayoutEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

export class LayoutRepository extends BaseRepository<EnforceEnvironmentQuery, LayoutEntity> {
  private layout: SoftDeleteModel;

  constructor() {
    super(Layout, LayoutEntity);
    this.layout = Layout;
  }

  async createLayout(entity: Omit<LayoutEntity, '_id' | 'createdAt' | 'updatedAt'>): Promise<LayoutEntity> {
    const { channel, content, contentType, isDefault, name, variables, _creatorId, _environmentId, _organizationId } =
      entity;

    return await this.create({
      _creatorId,
      _environmentId,
      _organizationId,
      content,
      contentType,
      isDefault,
      deleted: false,
      name,
      variables,
    });
  }

  async deleteLayout(_id: LayoutId, _environmentId: EnvironmentId, _organizationId: OrganizationId): Promise<void> {
    const deleteQuery: EnforceEnvironmentQuery = {
      _id,
      _environmentId,
      _organizationId,
    };

    const result = await this.layout.delete(deleteQuery);

    if (result.modifiedCount !== 1) {
      throw new DalException(
        `Soft delete of layout ${_id} in environment ${_environmentId} was not performed properly`
      );
    }
  }

  async filterLayouts(
    query: EnforceEnvironmentQuery,
    pagination: { limit: number; skip: number }
  ): Promise<LayoutEntity[]> {
    const data = await this.aggregate([
      {
        $match: {
          ...query,
        },
      },
      {
        $skip: pagination.skip,
      },
      {
        $limit: pagination.limit,
      },
    ]);

    return data;
  }

  async setLayoutAsDefault(
    _id: LayoutId,
    _environmentId: EnvironmentId,
    _organizationId: OrganizationId
  ): Promise<void> {
    await this.update(
      {
        _id,
        _environmentId,
        _organizationId,
      },
      {
        isDefault: true,
      }
    );
  }
}
