import {
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  UpdateSubscriber,
  CreateSubscriber,
  GetSubscriberGlobalPreference,
} from '@novu/application-generic';

import { GetSubscribers } from './get-subscribers';
import { GetSubscriber } from './get-subscriber';
import { GetPreferencesByLevel } from './get-preferences-by-level/get-preferences-by-level.usecase';
import { RemoveSubscriber } from './remove-subscriber';
import { SearchByExternalSubscriberIds } from './search-by-external-subscriber-ids';
import { UpdatePreference } from './update-preference/update-preference.usecase';
import { UpdateSubscriberChannel } from './update-subscriber-channel';
import { UpdateSubscriberPreference } from './update-subscriber-preference';
import { UpdateSubscriberOnlineFlag } from './update-subscriber-online-flag';
import { ChatOauth } from './chat-oauth/chat-oauth.usecase';
import { ChatOauthCallback } from './chat-oauth-callback/chat-oauth-callback.usecase';
import { DeleteSubscriberCredentials } from './delete-subscriber-credentials/delete-subscriber-credentials.usecase';
import { BulkCreateSubscribers } from './bulk-create-subscribers/bulk-create-subscribers.usecase';
import { UpdateSubscriberGlobalPreferences } from './update-subscriber-global-preferences';

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
  GetPreferencesByLevel,
  RemoveSubscriber,
  SearchByExternalSubscriberIds,
  UpdatePreference,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateSubscriberPreference,
  UpdateSubscriberOnlineFlag,
  ChatOauthCallback,
  ChatOauth,
  DeleteSubscriberCredentials,
  BulkCreateSubscribers,
  UpdateSubscriberGlobalPreferences,
  GetSubscriberGlobalPreference,
];
