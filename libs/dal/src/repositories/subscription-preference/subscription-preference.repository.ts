import { BaseRepository } from '../base-repository';
import { SubscriptionPreferenceEntity } from './subscription-preference.entity';
import { SubscriptionPreference } from './subscription-preference.schema';
import { Document, FilterQuery } from 'mongoose';

export class SubscriptionPreferenceRepository extends BaseRepository<
  FilterQuery<SubscriptionPreferenceEntity & Document>,
  SubscriptionPreferenceEntity
> {
  constructor() {
    super(SubscriptionPreference, SubscriptionPreferenceEntity);
  }
}
