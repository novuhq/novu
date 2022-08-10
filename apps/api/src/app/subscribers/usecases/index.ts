import { CreateSubscriber } from './create-subscriber';
import { UpdateSubscriber } from './update-subscriber';
import { RemoveSubscriber } from './remove-subscriber';
import { GetSubscribers } from './get-subscribers';
import { GetSubscriberPreference } from './get-subscriber-preference/get-subscriber-preference.usecase';
import { UpdateSubscriberPreference } from './update-subscriber-preference';
import { GetSubscriberTemplatePreference } from './get-subscriber-template-preference';
import { GetPreferences } from './get-preferences/get-preferences.usecase';
import { UpdatePreference } from './update-preference/update-preference.usecase';

export const USE_CASES = [
  CreateSubscriber,
  UpdateSubscriber,
  RemoveSubscriber,
  GetSubscribers,
  GetSubscriberPreference,
  UpdateSubscriberPreference,
  GetSubscriberTemplatePreference,
  GetPreferences,
  UpdatePreference,
];
