import {
  CreateOrUpdateSubscriberUseCase,
  EventsDistributedLockService,
  GetSubscriberTemplatePreference,
  UpdateSubscriber,
  UpdateSubscriberChannel,
} from '@novu/application-generic';

import { GetSubscribers } from './get-subscribers';
import { GetSubscriber } from './get-subscriber';
import { GetPreferencesByLevel } from './get-preferences-by-level/get-preferences-by-level.usecase';
import { RemoveSubscriber } from './remove-subscriber';
import { SearchByExternalSubscriberIds } from './search-by-external-subscriber-ids';
import { UpdateSubscriberOnlineFlag } from './update-subscriber-online-flag';
import { ChatOauth } from './chat-oauth/chat-oauth.usecase';
import { ChatOauthCallback } from './chat-oauth-callback/chat-oauth-callback.usecase';
import { DeleteSubscriberCredentials } from './delete-subscriber-credentials/delete-subscriber-credentials.usecase';
import { BulkCreateSubscribers } from './bulk-create-subscribers/bulk-create-subscribers.usecase';
import { CreateIntegration } from '../../integrations/usecases/create-integration/create-integration.usecase';
import { CheckIntegration } from '../../integrations/usecases/check-integration/check-integration.usecase';
import { CheckIntegrationEMail } from '../../integrations/usecases/check-integration/check-integration-email.usecase';
import { UpdatePreferences } from '../../inbox/usecases/update-preferences/update-preferences.usecase';
import { GetSubscriberGlobalPreference } from './get-subscriber-global-preference/get-subscriber-global-preference.usecase';
import { GetSubscriberPreference } from './get-subscriber-preference/get-subscriber-preference.usecase';

export {
  SearchByExternalSubscriberIds,
  SearchByExternalSubscriberIdsCommand,
} from './search-by-external-subscriber-ids';

export const USE_CASES = [
  CreateOrUpdateSubscriberUseCase,
  GetSubscribers,
  GetSubscriber,
  GetSubscriberPreference,
  GetSubscriberTemplatePreference,
  GetPreferencesByLevel,
  RemoveSubscriber,
  SearchByExternalSubscriberIds,
  UpdateSubscriber,
  UpdateSubscriberChannel,
  UpdateSubscriberOnlineFlag,
  ChatOauthCallback,
  ChatOauth,
  DeleteSubscriberCredentials,
  BulkCreateSubscribers,
  GetSubscriberGlobalPreference,
  CreateIntegration,
  CheckIntegration,
  EventsDistributedLockService,
  CheckIntegrationEMail,
  UpdatePreferences,
];
