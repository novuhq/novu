import { GetDecryptedIntegrations, CalculateLimitNovuIntegration, GetNovuIntegration } from '@novu/application-generic';

import { GetWebhookSupportStatus } from './get-webhook-support-status/get-webhook-support-status.usecase';
import { CreateIntegration } from './create-integration/create-integration.usecase';
import { GetIntegrations } from './get-integrations/get-integrations.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';
import { DeactivateSimilarChannelIntegrations } from './deactivate-integration/deactivate-integration.usecase';
import { GetActiveIntegrations } from './get-active-integration/get-active-integration.usecase';
import { CheckIntegration } from './check-integration/check-integration.usecase';
import { CheckIntegrationEMail } from './check-integration/check-integration-email.usecase';
import { GetInAppActivated } from './get-In-app-activated/get-In-app-activated.usecase';

export const USE_CASES = [
  GetInAppActivated,
  GetWebhookSupportStatus,
  CreateIntegration,
  GetIntegrations,
  GetActiveIntegrations,
  GetDecryptedIntegrations,
  UpdateIntegration,
  RemoveIntegration,
  DeactivateSimilarChannelIntegrations,
  CheckIntegration,
  CheckIntegrationEMail,
  GetNovuIntegration,
  CalculateLimitNovuIntegration,
];
