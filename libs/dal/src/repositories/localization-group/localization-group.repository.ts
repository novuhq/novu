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
    _resourceInternalId: string,
    environmentId: string,
    organizationId: string
  ) {
    let group = await this.findByResource(resourceType, _resourceInternalId, environmentId, organizationId);

    if (!group) {
      group = await this.create({
        resourceType,
        resourceId,
        _resourceInternalId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      });
    }

    return group;
  }

  async findByResourceType(resourceType: LocalizationResourceEnum, environmentId: string, organizationId: string) {
    return this.find({
      resourceType,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async getAllGroups(environmentId: string, organizationId: string) {
    return this.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }
}
