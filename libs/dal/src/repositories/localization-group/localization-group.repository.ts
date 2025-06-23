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
    resourceId: string,
    environmentId: string,
    organizationId: string
  ) {
    return this.findOne({
      resourceType,
      resourceId,
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
    environmentId: string,
    organizationId: string,
    name?: string,
    description?: string
  ) {
    let group = await this.findByResource(resourceType, resourceId, environmentId, organizationId);

    if (!group) {
      group = await this.create({
        resourceType,
        resourceId,
        name,
        description,
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
