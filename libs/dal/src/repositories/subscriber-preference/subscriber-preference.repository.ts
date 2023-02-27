import { BaseRepository } from '../base-repository';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { SubscriberPreferenceEntity, SubscriberPreferenceDBModel } from './subscriber-preference.entity';
import { SubscriberPreference } from './subscriber-preference.schema';

export class SubscriberPreferenceRepository extends BaseRepository<
  SubscriberPreferenceDBModel,
  SubscriberPreferenceEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(SubscriberPreference, SubscriberPreferenceEntity);
  }

  async findSubscriberPreferences(
    environmentId: string,
    subscriberId: string,
    templatesIds: string[]
  ): Promise<SubscriberPreferenceEntity[]> {
    return await this.find({
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      _templateId: {
        $in: templatesIds,
      },
    });
  }
}
