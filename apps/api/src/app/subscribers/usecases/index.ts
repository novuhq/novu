import { CreateSubscriber } from './create-subscriber';
import { UpdateSubscriber } from './update-subscriber';
import { RemoveSubscriber } from './remove-subscriber';
import { GetSubscribers } from './get-subscribers';
import { GetSubscriberPreference } from '../../widgets/usecases/get-subscriber-preference/get-subscriber-preference.usecase';
import { UpdateSubscriberPreference } from '../../widgets/usecases/update-subscriber-preference/update-subscriber-preference.usecase';
import { GetSubscriberTemplatePreference } from '../../widgets/usecases/get-subscriber-template-preference';

export const USE_CASES = [
  CreateSubscriber,
  UpdateSubscriber,
  RemoveSubscriber,
  GetSubscribers,
  GetSubscriberPreference,
  UpdateSubscriberPreference,
  GetSubscriberTemplatePreference,
];
