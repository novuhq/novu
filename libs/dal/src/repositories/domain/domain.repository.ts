import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { DomainDBModel, DomainEntity } from './domain.entity';
import { Domain } from './domain.schema';

export class DomainRepository extends BaseRepositoryV2<DomainDBModel, DomainEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Domain, DomainEntity);
  }

  async findOneByIdAndEnvironment(
    id: string,
    environmentId: string,
    organizationId: string
  ): Promise<DomainEntity | null> {
    return this.findOne(
      {
        _id: id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      '*'
    );
  }

  /**
   * Domain names are globally unique, so no environment/org filter is needed —
   * the cast bypasses the EnforceEnvOrOrgIds constraint intentionally.
   */
  async findByName(
    name: string
  ): Promise<Pick<
    DomainEntity,
    '_id' | 'name' | 'status' | 'mxRecordConfigured' | '_environmentId' | '_organizationId' | 'data'
  > | null> {
    return this.findOne({ name } as unknown as FilterQuery<DomainDBModel> & EnforceEnvOrOrgIds, [
      '_id',
      'name',
      'status',
      'mxRecordConfigured',
      '_environmentId',
      '_organizationId',
      'data',
    ]);
  }

  async findByEnvironment(environmentId: string, organizationId: string): Promise<DomainEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      '*'
    );
  }

  async listDomains({
    organizationId,
    environmentId,
    limit = 10,
    after,
    before,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
    name,
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
    name?: string;
  }): Promise<{
    domains: DomainEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    let domain: DomainEntity | null = null;
    const id = before || after;

    if (id) {
      const cursorFields = sortBy === '_id' ? ['_id'] : ['_id', sortBy];

      domain = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _id: id,
          ...(name ? { name: { $regex: this.regExpEscape(name), $options: 'i' } } : {}),
        },
        cursorFields as (keyof DomainEntity)[]
      );

      if (!domain) {
        return {
          domains: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor = after && domain ? { sortBy: domain[sortBy], paginateField: domain._id } : undefined;
    const beforeCursor = before && domain ? { sortBy: domain[sortBy], paginateField: domain._id } : undefined;

    const query: FilterQuery<DomainDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (name) {
      query.name = { $regex: this.regExpEscape(name), $options: 'i' };
    }

    const pagination = await this.findWithCursorBasedPagination({
      after: afterCursor,
      before: beforeCursor,
      paginateField: '_id',
      limit,
      sortDirection: sortDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      sortBy,
      includeCursor,
      query,
      select: '*',
    });

    return {
      domains: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
