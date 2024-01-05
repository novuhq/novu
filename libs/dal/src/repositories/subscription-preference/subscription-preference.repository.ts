import { BaseRepository } from '../base-repository';
import { SubscriptionPreferenceEntity, SubscriptionPreferenceDBModel } from './subscription-preference.entity';
import { SubscriptionPreference } from './subscription-preference.schema';

export class SubscriptionPreferenceRepository extends BaseRepository<
  SubscriptionPreferenceDBModel,
  SubscriptionPreferenceEntity,
  object
> {
  constructor() {
    super(SubscriptionPreference, SubscriptionPreferenceEntity);
  }
}
