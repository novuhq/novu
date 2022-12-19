import { CreateSubscriber } from './create-subscriber';
import { GetSubscribers } from './get-subscribers';
import { GetSubscriber } from './get-subscriber';
import { GetSubscriberPreference } from './get-subscriber-preference/get-subscriber-preference.usecase';
import { GetSubscriberTemplatePreference } from './get-subscriber-template-preference';
import { GetPreferences } from './get-preferences/get-preferences.usecase';
import { RemoveSubscriber } from './remove-subscriber';
import { SearchByExternalSubscriberIds } from './search-by-external-subscriber-ids';
import { UpdatePreference } from './update-preference/update-preference.usecase';
import { UpdateSubscriber } from './update-subscriber';
import { UpdateSubscriberChannel } from './update-subscriber-channel';
import { UpdateSubscriberPreference } from './update-subscriber-preference';

export {
  SearchByExternalSubscriberIds,
  SearchByExternalSubscriberIdsCommand,
} from './search-by-external-subscriber-ids';

export const USE_CASES = [
  CreateSubscriber,
  GetSubscribers,
  GetSubscriber,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  GetPreferences,
  RemoveSubscriber,
  SearchByExternalSubscriberIds,
  UpdatePreference,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateSubscriberPreference,
];
