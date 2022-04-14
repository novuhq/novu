import { PromoteMessageTemplateChange } from './promote-message-template-change/promote-message-template-change';
import { PromoteNotificationTemplateChange } from './promote-notification-template-change/promote-notification-template-change';
import { PromoteChangeToEnvironment } from './promote-change-to-environment/promote-change-to-environment.usecase';
import { CreateChange } from './create-change.usecase';
export const USE_CASES = [
  CreateChange,
  PromoteChangeToEnvironment,
  PromoteNotificationTemplateChange,
  PromoteMessageTemplateChange,
];
