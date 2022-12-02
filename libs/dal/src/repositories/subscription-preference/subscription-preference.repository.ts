import { Document, FilterQuery } from 'mongoose';
import { BaseRepository } from '../base-repository';
import { SubscriptionPreferenceEntity } from './subscription-preference.entity';
import { SubscriptionPreference } from './subscription-preference.schema';

export class SubscriptionPreferenceRepository extends BaseRepository<
  FilterQuery<SubscriptionPreferenceEntity & Document>,
  SubscriptionPreferenceEntity
> {
  constructor() {
    super(SubscriptionPreference, SubscriptionPreferenceEntity);
  }
}
