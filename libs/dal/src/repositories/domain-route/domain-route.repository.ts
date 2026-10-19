import { DirectionEnum } from '@novu/shared';
import { ClientSession, FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { DomainRouteDBModel, DomainRouteEntity } from './domain-route.entity';
import { DomainRoute } from './domain-route.schema';

export class DomainRouteRepository extends BaseRepositoryV2<DomainRouteDBModel, DomainRouteEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(DomainRoute, DomainRouteEntity);
  }

  async findOneByAddressAndDomain(
    address: string,
    domainId: string,
    environmentId: string,
    organizationId: string
  ): Promise<DomainRouteEntity | null> {
    return this.findOne(
      {
        address,
        _domainId: domainId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      '*'
    );
  }

  async findByDomainAndAddresses({
    domainId,
    environmentId,
    organizationId,
    addresses,
  }: {
    domainId: string;
    environmentId: string;
    organizationId: string;
    addresses: string[];
  }): Promise<DomainRouteEntity[]> {
    return this.find(
      {
        _domainId: domainId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        address: { $in: addresses },
      },
      '*'
    );
  }

  async removeByDestination(
    environmentId: string,
    organizationId: string,
    destination: string,
    options: { session?: ClientSession | null } = {}
  ): Promise<void> {
    await this.delete(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        destination,
      },
      { session: options.session }
    );
  }

  async listRoutes({
    organizationId,
    environmentId,
    domainId,
    destination,
    limit = 10,
    after,
    before,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
  }: {
    organizationId: string;
    environmentId: string;
    domainId?: string;
    destination?: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
  }): Promise<{
    routes: DomainRouteEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    let route: DomainRouteEntity | null = null;
    const id = before || after;

    if (id) {
      const cursorFields = sortBy === '_id' ? ['_id'] : ['_id', sortBy];

      route = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _id: id,
          ...(domainId ? { _domainId: domainId } : {}),
          ...(destination ? { destination } : {}),
        },
        cursorFields as (keyof DomainRouteEntity)[]
      );

      if (!route) {
        return {
          routes: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor = after && route ? { sortBy: route[sortBy], paginateField: route._id } : undefined;
    const beforeCursor = before && route ? { sortBy: route[sortBy], paginateField: route._id } : undefined;

    const query: FilterQuery<DomainRouteDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      ...(domainId ? { _domainId: domainId } : {}),
      ...(destination ? { destination } : {}),
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
      routes: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }

  async listRoutesByDomain(params: {
    organizationId: string;
    environmentId: string;
    domainId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
  }) {
    return this.listRoutes(params);
  }
}
