import { AddAgentIntegration } from '../channels/integrations/add-agent-integration/add-agent-integration.usecase';
import { ListAgentIntegrations } from '../channels/integrations/list-agent-integrations/list-agent-integrations.usecase';
import { RemoveAgentIntegration } from '../channels/integrations/remove-agent-integration/remove-agent-integration.usecase';
import { UpdateAgentIntegration } from '../channels/integrations/update-agent-integration/update-agent-integration.usecase';
import { ConsumeSlackSetupLink } from '../channels/slack-linking/consume-slack-setup-link/consume-slack-setup-link.usecase';
import { GetSlackSetupLinkStatus } from '../channels/slack-linking/get-slack-setup-link-status/get-slack-setup-link-status.usecase';
import { IssueSlackSetupLink } from '../channels/slack-linking/issue-slack-setup-link/issue-slack-setup-link.usecase';
import { ConfigureTelegramAgentWebhook } from '../channels/telegram/configure-telegram-agent-webhook/configure-telegram-agent-webhook.usecase';
import { ConsumeTelegramMobileLink } from '../channels/telegram-linking/consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { GetTelegramMobileLinkStatus } from '../channels/telegram-linking/get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';
import { IssueTelegramMobileLink } from '../channels/telegram-linking/issue-telegram-mobile-link/issue-telegram-mobile-link.usecase';
import { IssueTelegramSubscriberLink } from '../channels/telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { LinkTelegramChatToSubscriber } from '../channels/telegram-linking/link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { ConfigureWhatsAppWebhook } from '../channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { SendWhatsAppTestTemplate } from '../channels/whatsapp/send-whatsapp-test-template/send-whatsapp-test-template.usecase';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { SendAgentWelcomeMessage } from '../conversation-runtime/reply/send-agent-welcome-message/send-agent-welcome-message.usecase';
import { SendAgentTestEmail } from '../email/send-agent-test-email/send-agent-test-email.usecase';
import { CompleteManagedAgentSetup } from '../managed-runtime/setup/complete-managed-agent-setup.usecase';
import { HandleManagedAgentSetupInbound } from '../managed-runtime/setup/handle-managed-agent-setup-inbound.usecase';
import { ConfirmToolApproval } from '../managed-runtime/tool-approval/confirm-tool-approval.usecase';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import { CreateAgent } from '../management/usecases/create-agent/create-agent.usecase';
import { DeleteAgent } from '../management/usecases/delete-agent/delete-agent.usecase';
import { GenerateManagedAgent } from '../management/usecases/generate-managed-agent/generate-managed-agent.usecase';
import { GetAgent } from '../management/usecases/get-agent/get-agent.usecase';
import { GetAgentDemoQuota } from '../management/usecases/get-agent-demo-quota/get-agent-demo-quota.usecase';
import { GetAgentRuntimeConfig } from '../management/usecases/get-agent-runtime-config/get-agent-runtime-config.usecase';
import { ListAgents } from '../management/usecases/list-agents/list-agents.usecase';
import { MigrateAgentRuntime } from '../management/usecases/migrate-agent-runtime/migrate-agent-runtime.usecase';
import { ProvisionManagedAgent } from '../management/usecases/provision-managed-agent/provision-managed-agent.usecase';
import { SyncAgentToEnvironment } from '../management/usecases/sync-agent-to-environment/sync-agent-to-environment.usecase';
import { UpdateAgent } from '../management/usecases/update-agent/update-agent.usecase';
import { UpdateAgentInboxShared } from '../management/usecases/update-agent-inbox-shared/update-agent-inbox-shared.usecase';
import { UpdateAgentRuntimeConfig } from '../management/usecases/update-agent-runtime-config/update-agent-runtime-config.usecase';
import { UploadCustomSkill } from '../management/usecases/upload-custom-skill/upload-custom-skill.usecase';
import { VerifyManagedCredentials } from '../management/usecases/verify-managed-credentials/verify-managed-credentials.usecase';
import { CompleteProviderManagedRedirect } from '../mcp/connections/ensure-provider-managed-vault/complete-provider-managed-redirect.usecase';
import { EnsureProviderManagedVault } from '../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { GetMcpConnectionStatus } from '../mcp/connections/get-mcp-connection-status/get-mcp-connection-status.usecase';
import { GenerateMcpOAuthUrl } from '../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { McpOAuthCallback } from '../mcp/oauth/mcp-oauth-callback/mcp-oauth-callback.usecase';
import { DisableAgentMcpServer } from '../mcp/servers/disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServer } from '../mcp/servers/enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { ListAgentMcpServers } from '../mcp/servers/list-agent-mcp-servers/list-agent-mcp-servers.usecase';
import { SetAgentMcpServers } from '../mcp/servers/set-agent-mcp-servers/set-agent-mcp-servers.usecase';
import { SyncAgentMcpServers } from '../mcp/servers/sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
import { ListAgentEmoji } from '../shared/emoji/list-agent-emoji/list-agent-emoji.usecase';

export {
  ConfigureTelegramAgentWebhook,
  ConsumeSlackSetupLink,
  ConsumeTelegramMobileLink,
  GetSlackSetupLinkStatus,
  GetTelegramMobileLinkStatus,
  IssueSlackSetupLink,
  IssueTelegramMobileLink,
  IssueTelegramSubscriberLink,
  LinkTelegramChatToSubscriber,
};

export const USE_CASES = [
  CreateAgent,
  ConfigureTelegramAgentWebhook,
  ConsumeSlackSetupLink,
  ConsumeTelegramMobileLink,
  GetAgent,
  GetAgentRuntimeConfig,
  GetSlackSetupLinkStatus,
  GetTelegramMobileLinkStatus,
  ListAgents,
  UpdateAgent,
  UpdateAgentInboxShared,
  UpdateAgentRuntimeConfig,
  UploadCustomSkill,
  DeleteAgent,
  AddAgentIntegration,
  ConfigureWhatsAppWebhook,
  GenerateManagedAgent,
  IssueSlackSetupLink,
  IssueTelegramMobileLink,
  IssueTelegramSubscriberLink,
  LinkTelegramChatToSubscriber,
  ListAgentEmoji,
  ListAgentIntegrations,
  UpdateAgentIntegration,
  GetAgentDemoQuota,
  MigrateAgentRuntime,
  RemoveAgentIntegration,
  HandleAgentReply,
  HandlePlanProgress,
  ProvisionManagedAgent,
  SendAgentTestEmail,
  SendAgentWelcomeMessage,
  SendWhatsAppTestTemplate,
  SyncAgentToEnvironment,
  SyncAgentMcpServers,
  EnableAgentMcpServer,
  DisableAgentMcpServer,
  SetAgentMcpServers,
  ListAgentMcpServers,
  GenerateMcpOAuthUrl,
  EnsureProviderManagedVault,
  CompleteProviderManagedRedirect,
  HandleManagedAgentSetupInbound,
  CompleteManagedAgentSetup,
  McpOAuthCallback,
  GetMcpConnectionStatus,
  VerifyManagedCredentials,
  HandlePendingToolApprovals,
  ConfirmToolApproval,
];
