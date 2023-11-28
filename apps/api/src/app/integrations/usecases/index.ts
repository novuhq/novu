import {
  SelectIntegration,
  GetDecryptedIntegrations,
  CalculateLimitNovuIntegration,
  ConditionsFilter,
} from '@novu/application-generic';

import { GetWebhookSupportStatus } from './get-webhook-support-status/get-webhook-support-status.usecase';
import { CreateIntegration } from './create-integration/create-integration.usecase';
import { GetIntegrations } from './get-integrations/get-integrations.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';
import { GetActiveIntegrations } from './get-active-integration/get-active-integration.usecase';
import { CheckIntegration } from './check-integration/check-integration.usecase';
import { CheckIntegrationEMail } from './check-integration/check-integration-email.usecase';
import { GetInAppActivated } from './get-in-app-activated/get-in-app-activated.usecase';
import { SetIntegrationAsPrimary } from './set-integration-as-primary/set-integration-as-primary.usecase';
import { CreateNovuIntegrations } from './create-novu-integrations/create-novu-integrations.usecase';

export const USE_CASES = [
  GetInAppActivated,
  GetWebhookSupportStatus,
  CreateIntegration,
  ConditionsFilter,
  GetIntegrations,
  GetActiveIntegrations,
  SelectIntegration,
  GetDecryptedIntegrations,
  UpdateIntegration,
  RemoveIntegration,
  CheckIntegration,
  CheckIntegrationEMail,
  CalculateLimitNovuIntegration,
  SetIntegrationAsPrimary,
  CreateNovuIntegrations,
];
