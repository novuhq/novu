import { accessTokenTemplate } from './access-token';
import { usageLimitTemplate } from './usage-limit';

import { appointmentReminderTemplate } from './appointment-reminder';
import { otpTemplate } from './otp';
import { paymentConfirmedTemplate } from './payment-confirmed';
import { recentLoginTemplate } from './recent-login';
import { renewalNoticeTemplate } from './renewal-notice';
import { WorkflowTemplate } from './types';

export function getTemplates(): WorkflowTemplate[] {
  return [
    accessTokenTemplate,
    usageLimitTemplate,
    otpTemplate,
    renewalNoticeTemplate,
    appointmentReminderTemplate,
    recentLoginTemplate,
    paymentConfirmedTemplate,
  ];
}

export * from './types';
