import { BaseRepository, Omit } from '../base-repository';
import { SubscriberPreferenceEntity } from './subscriber-preference.entity';
import { SubscriberPreference } from './subscriber-preference.schema';
import { Document, FilterQuery } from 'mongoose';

class PartialIntegrationEntity extends Omit(SubscriberPreferenceEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class SubscriberPreferenceRepository extends BaseRepository<
  EnforceEnvironmentQuery,
  SubscriberPreferenceEntity
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
