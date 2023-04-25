import {
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  UpdateSubscriber,
  CreateSubscriber,
} from '@novu/application-generic';

import { GetSubscribers } from './get-subscribers';
import { GetSubscriber } from './get-subscriber';
import { GetPreferences } from './get-preferences/get-preferences.usecase';
import { RemoveSubscriber } from './remove-subscriber';
import { SearchByExternalSubscriberIds } from './search-by-external-subscriber-ids';
import { UpdatePreference } from './update-preference/update-preference.usecase';
import { UpdateSubscriberChannel } from './update-subscriber-channel';
import { UpdateSubscriberPreference } from './update-subscriber-preference';
import { UpdateSubscriberOnlineFlag } from './update-subscriber-online-flag';

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
  UpdateSubscriberOnlineFlag,
];
