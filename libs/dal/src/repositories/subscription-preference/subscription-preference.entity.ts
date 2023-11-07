import type { IEntity, TransformEntityToDbModel } from '../../types';

export class SubscriptionPreferenceEntity implements IEntity {
  _id: string;
  name: string;
}

export type SubscriptionPreferenceDBModel = TransformEntityToDbModel<SubscriptionPreferenceEntity>;
