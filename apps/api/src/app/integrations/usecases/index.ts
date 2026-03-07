import {
  CalculateLimitNovuIntegration,
  ConditionsFilter,
  GetActiveIntegrations,
  GetDecryptedIntegrations,
  NormalizeVariables,
  SelectIntegration,
} from '@novu/application-generic';
import { AutoConfigureIntegration } from './auto-configure-integration/auto-configure-integration.usecase';
import { ChatOauthCallback } from './chat-oauth-callback/chat-oauth-callback.usecase';
import { MsTeamsOauthCallback } from './chat-oauth-callback/msteams-oauth-callback/msteams-oauth-callback.usecase';
import { SlackOauthCallback } from './chat-oauth-callback/slack-oauth-callback/slack-oauth-callback.usecase';
import { CheckIntegration } from './check-integration/check-integration.usecase';
import { CheckIntegrationEMail } from './check-integration/check-integration-email.usecase';
import { CreateIntegration } from './create-integration/create-integration.usecase';
import { CreateNovuIntegrations } from './create-novu-integrations/create-novu-integrations.usecase';
import { GenerateChatOauthUrl } from './generate-chat-oath-url/generate-chat-oauth-url.usecase';
import { GenerateMsTeamsOauthUrl } from './generate-chat-oath-url/generate-msteams-oath-url/generate-msteams-oauth-url.usecase';
import { GenerateSlackOauthUrl } from './generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';
import { GetInAppActivated } from './get-in-app-activated/get-in-app-activated.usecase';
import { GetIntegrations } from './get-integrations/get-integrations.usecase';
import { GetWebhookSupportStatus } from './get-webhook-support-status/get-webhook-support-status.usecase';
import { RemoveIntegration } from './remove-integration/remove-integration.usecase';
import { SetIntegrationAsPrimary } from './set-integration-as-primary/set-integration-as-primary.usecase';
import { UpdateIntegration } from './update-integration/update-integration.usecase';

export const USE_CASES = [
  GetInAppActivated,
  GetWebhookSupportStatus,
  CreateIntegration,
  AutoConfigureIntegration,
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
  NormalizeVariables,
  GenerateChatOauthUrl,
  GenerateSlackOauthUrl,
  GenerateMsTeamsOauthUrl,
  SlackOauthCallback,
  MsTeamsOauthCallback,
  ChatOauthCallback,
];
