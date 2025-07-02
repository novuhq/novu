import { BaseRepository } from '../base-repository';
import {
  LocalizationGroupEntity,
  LocalizationGroupDBModel,
  LocalizationResourceEnum,
} from './localization-group.entity';
import { LocalizationGroup } from './localization-group.schema';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export class LocalizationGroupRepository extends BaseRepository<
  LocalizationGroupDBModel,
  LocalizationGroupEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(LocalizationGroup, LocalizationGroupEntity);
  }

  async findByResource(
    resourceType: LocalizationResourceEnum,
    resourceInternalId: string,
    environmentId: string,
    organizationId: string
  ) {
    return this.findOne({
      resourceType,
      _resourceInternalId: resourceInternalId,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async findByIds(ids: string[], environmentId: string, organizationId: string): Promise<LocalizationGroupEntity[]> {
    return this.find({
      _id: { $in: ids },
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async getOrCreateForResource(
    resourceType: LocalizationResourceEnum,
    resourceId: string,
    resourceName: string,
    _resourceInternalId: string,
    environmentId: string,
    organizationId: string
  ) {
    let group = await this.findByResource(resourceType, _resourceInternalId, environmentId, organizationId);

    if (!group) {
      group = await this.create({
        resourceType,
        resourceId,
        resourceName,
        _resourceInternalId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      });
    } else if (group.resourceName !== resourceName) {
      // Update resource name if it has changed
      await this.update(
        {
          _id: group._id,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        { resourceName }
      );

      group = await this.findByResource(resourceType, _resourceInternalId, environmentId, organizationId);
    }

    return group;
  }

  async findPaginatedGroups(
    environmentId: string,
    organizationId: string,
    options: {
      query?: string;
      limit: number;
      offset: number;
    }
  ): Promise<{ data: LocalizationGroupEntity[]; totalCount: number }> {
    const { query, limit, offset } = options;

    const filters: any = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (query) {
      // Use regex search like workflow controller for consistency
      filters.$or = [
        { resourceName: { $regex: this.regExpEscape(query), $options: 'i' } },
        { resourceId: { $regex: this.regExpEscape(query), $options: 'i' } },
      ];
    }

    const [totalCount, data] = await Promise.all([
      this.count(filters),
      this.find(
        filters,
        {},
        {
          sort: { updatedAt: -1 },
          skip: offset,
          limit,
        }
      ),
    ]);

    return { data, totalCount };
  }
}
