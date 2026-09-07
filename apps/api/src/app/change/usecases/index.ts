import {
  CreateChange,
  DeletePreferencesUseCase,
  GetPreferences,
  UpdateChange,
  UpsertPreferences,
} from '@novu/application-generic';
import { ApplyChange } from './apply-change/apply-change.usecase';
import { BulkApplyChange } from './bulk-apply-change/bulk-apply-change.usecase';
import { CountChanges } from './count-changes/count-changes.usecase';
import { GetChanges } from './get-changes/get-changes.usecase';
import { PromoteChangeToEnvironment } from './promote-change-to-environment/promote-change-to-environment.usecase';
import { PromoteFeedChange } from './promote-feed-change/promote-feed-change';
import { PromoteLayoutChange } from './promote-layout-change/promote-layout-change.use-case';
import { PromoteMessageTemplateChange } from './promote-message-template-change/promote-message-template-change';
import { PromoteNotificationGroupChange } from './promote-notification-group-change/promote-notification-group-change';
import { PromoteNotificationTemplateChange } from './promote-notification-template-change/promote-notification-template-change.usecase';
import { PromoteTranslationChange } from './promote-translation-change';
import { PromoteTranslationGroupChange } from './promote-translation-group-change';

export * from './apply-change';
export * from './promote-change-to-environment';
export * from './promote-notification-template-change';

export const USE_CASES = [
  CreateChange,
  PromoteChangeToEnvironment,
  PromoteFeedChange,
  PromoteLayoutChange,
  PromoteNotificationGroupChange,
  PromoteNotificationTemplateChange,
  PromoteMessageTemplateChange,
  ApplyChange,
  GetChanges,
  BulkApplyChange,
  CountChanges,
  UpdateChange,
  PromoteTranslationChange,
  PromoteTranslationGroupChange,
  GetPreferences,
  UpsertPreferences,
  DeletePreferencesUseCase,
];
