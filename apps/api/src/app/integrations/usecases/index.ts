import { GetWebhookSupportStatus } from './get-webhook-support-status/get-webhook-support-status.usecase';
import { CreateIntegration } from './create-integration/create-integration.usecase';
import { GetIntegrations } from './get-integrations/get-integrations.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';
import { DeactivateSimilarChannelIntegrations } from './deactivate-integration/deactivate-integration.usecase';
import { GetActiveIntegrations } from './get-active-integration/get-active-integration.usecase';
import { GetDecryptedIntegrations } from './get-decrypted-integrations/get-decrypted-integrations.usecase';
import { CheckIntegration } from './check-integration/check-integration.usecase';
import { CheckIntegrationEMail } from './check-integration/check-integration-email.usecase';

export const USE_CASES = [
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
];
