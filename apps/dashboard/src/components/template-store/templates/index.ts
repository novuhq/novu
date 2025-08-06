import { accessTokenTemplate } from './access-token';
import { appointmentReminderTemplate } from './appointment-reminder';
import { emailVerificationCodeTemplate } from './authentication/email-verification-code';
import { organizationInvitationTemplate } from './authentication/organization-invitation';
import { recentLoginTemplate } from './authentication/recent-login';
import { resetPasswordCodeTemplate } from './authentication/reset-password-code';
import { signInMagicLinkTemplate } from './authentication/sign-in-magic-link';
import { signUpMagicLinkTemplate } from './authentication/sign-up-magic-link';
import { welcomeTemplate } from './authentication/welcome';
import { cardExpiringTemplate } from './billing/card-expiring';
import { failedPaymentTemplate } from './billing/failed-payment';
import { sendingInvoiceTemplate } from './billing/sending-invoice';
import { trialEndsTemplate } from './billing/trial-ends';
import { upcomingInvoiceTemplate } from './billing/upcoming-invoice';
import { paymentConfirmedTemplate } from './payment-confirmed';
import { WorkflowTemplate } from './types';
import { usageLimitTemplate } from './usage-limit';

export function getTemplates(): WorkflowTemplate[] {
  return [
    emailVerificationCodeTemplate,
    organizationInvitationTemplate,
    recentLoginTemplate,
    resetPasswordCodeTemplate,
    signInMagicLinkTemplate,
    signUpMagicLinkTemplate,
    welcomeTemplate,
    cardExpiringTemplate,
    failedPaymentTemplate,
    sendingInvoiceTemplate,
    trialEndsTemplate,
    upcomingInvoiceTemplate,
    accessTokenTemplate,
    appointmentReminderTemplate,
    paymentConfirmedTemplate,
    usageLimitTemplate,
  ];
}

export * from './types';
