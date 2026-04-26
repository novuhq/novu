import { DirectionEnum } from '@novu/shared';
import { ClientSession, FilterQuery } from 'mongoose';

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
   * Looks up a domain by a route address (e.g. "support@customer.com").
   * Domain names are globally unique, so no environment/org filter is needed —
   * the cast bypasses the EnforceEnvOrOrgIds constraint intentionally.
   */
  async findByRouteAddress(
    address: string
  ): Promise<Pick<
    DomainEntity,
    '_id' | 'name' | 'status' | 'mxRecordConfigured' | 'routes' | '_environmentId' | '_organizationId'
  > | null> {
    const domainName = address.split('@')[1];

    if (!domainName) {
      return null;
    }

    return this.findOne({ name: domainName } as unknown as FilterQuery<DomainDBModel> & EnforceEnvOrOrgIds, [
      '_id',
      'name',
      'status',
      'mxRecordConfigured',
      'routes',
      '_environmentId',
      '_organizationId',
    ]);
  }

  /**
   * Removes all routes that point to a given agent destination across all
   * domains in the environment. Used for cascade cleanup on agent deletion.
   */
  async removeRoutesByDestination(
    environmentId: string,
    organizationId: string,
    destination: string,
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.update(
      { _environmentId: environmentId, _organizationId: organizationId, 'routes.destination': destination },
      { $pull: { routes: { destination } } },
      { session: options.session }
    );
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
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
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
