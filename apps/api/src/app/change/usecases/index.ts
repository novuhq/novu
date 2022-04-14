import { ChangeEnabledMessageTemplate } from './change-enabled-message-template/change-enabled-message-template';
import { ChangeEnabledNotificationTemplate } from './change-enabled-notification-template/change-enabled-notification-template';
import { ChangeEnabled } from './change-enabled/change-enabled.usecase';
import { CreateChange } from './create-change.usecase';
export const USE_CASES = [CreateChange, ChangeEnabled, ChangeEnabledNotificationTemplate, ChangeEnabledMessageTemplate];
