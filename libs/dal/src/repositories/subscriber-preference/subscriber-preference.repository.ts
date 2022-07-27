import { BaseRepository } from '../base-repository';
import { SubscriberPreferenceEntity } from './subscriber-preference.entity';
import { SubscriberPreference } from './subscriber-preference.schema';

export class SubscriberPreferenceRepository extends BaseRepository<SubscriberPreferenceEntity> {
  constructor() {
    super(SubscriberPreference, SubscriberPreferenceEntity);
  }
}
