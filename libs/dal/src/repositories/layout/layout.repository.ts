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

  async createLayout(entity: Omit<LayoutEntity, '_id'>): Promise<LayoutEntity> {
    const { channel, content, contentType, isDefault, name, variables, _creatorId, _environmentId, _organizationId } =
      entity;

    return await this.create({
      _creatorId,
      _environmentId,
      _organizationId,
      content,
      contentType,
      isDefault,
      isDeleted: false,
      name,
      variables,
    });
  }

  async deleteLayout(_id: LayoutId, _environmentId: EnvironmentId, _organizationId: OrganizationId): Promise<void> {
    const layout = await this.findOne({
      _id,
      _environmentId,
      _organizationId,
    });

    if (!layout) {
      throw new DalException(`Could not find layout ${_id} to delete`);
    }

    const deleteQuery: EnforceEnvironmentQuery = {
      _id: layout._id,
      _environmentId: layout._environmentId,
      _organizationId: layout._organizationId,
    };

    await this.layout.delete(deleteQuery);
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
        $limit: pagination.limit,
      },
      {
        $skip: pagination.skip,
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
