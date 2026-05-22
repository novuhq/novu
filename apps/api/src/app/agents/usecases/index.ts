import { AddAgentIntegration } from './add-agent-integration/add-agent-integration.usecase';
import { CleanupNovuEmail } from './cleanup-novu-email/cleanup-novu-email.usecase';
import { ConfigureTelegramAgentWebhook } from './configure-telegram-agent-webhook/configure-telegram-agent-webhook.usecase';
import { ConfigureWhatsAppWebhook } from './configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { ConsumeTelegramMobileLink } from './consume-telegram-mobile-link/consume-telegram-mobile-link.usecase';
import { CreateAgent } from './create-agent/create-agent.usecase';
import { DeleteAgent } from './delete-agent/delete-agent.usecase';
import { DisableAgentMcpServer } from './disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServer } from './enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { FindOrCreateNovuEmail } from './find-or-create-novu-email/find-or-create-novu-email.usecase';
import { GenerateManagedAgent } from './generate-managed-agent/generate-managed-agent.usecase';
import { GenerateMcpOAuthUrl } from './generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { GetAgent } from './get-agent/get-agent.usecase';
import { GetAgentRuntimeConfig } from './get-agent-runtime-config/get-agent-runtime-config.usecase';
import { GetMcpConnectionStatus } from './get-mcp-connection-status/get-mcp-connection-status.usecase';
import { GetTelegramMobileLinkStatus } from './get-telegram-mobile-link-status/get-telegram-mobile-link-status.usecase';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';
import { IssueTelegramMobileLink } from './issue-telegram-mobile-link/issue-telegram-mobile-link.usecase';
import { IssueTelegramSubscriberLink } from './issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';
import { LinkTelegramChatToSubscriber } from './link-telegram-chat-to-subscriber/link-telegram-chat-to-subscriber.usecase';
import { ListAgentEmoji } from './list-agent-emoji/list-agent-emoji.usecase';
import { ListAgentIntegrations } from './list-agent-integrations/list-agent-integrations.usecase';
import { ListAgentMcpServers } from './list-agent-mcp-servers/list-agent-mcp-servers.usecase';
import { ListAgents } from './list-agents/list-agents.usecase';
import { McpOAuthCallback } from './mcp-oauth-callback/mcp-oauth-callback.usecase';
import { ProvisionManagedAgent } from './provision-managed-agent/provision-managed-agent.usecase';
import { RemoveAgentIntegration } from './remove-agent-integration/remove-agent-integration.usecase';
import { SendAgentTestEmail } from './send-agent-test-email/send-agent-test-email.usecase';
import { SendAgentWelcomeMessage } from './send-agent-welcome-message/send-agent-welcome-message.usecase';
import { SendWhatsAppTestTemplate } from './send-whatsapp-test-template/send-whatsapp-test-template.usecase';
import { SyncAgentMcpServers } from './sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
import { SyncAgentToEnvironment } from './sync-agent-to-environment/sync-agent-to-environment.usecase';
import { UpdateAgent } from './update-agent/update-agent.usecase';
import { UpdateAgentInboxShared } from './update-agent-inbox-shared/update-agent-inbox-shared.usecase';
import { UpdateAgentIntegration } from './update-agent-integration/update-agent-integration.usecase';
import { UpdateAgentRuntimeConfig } from './update-agent-runtime-config/update-agent-runtime-config.usecase';
import { UploadCustomSkill } from './upload-custom-skill/upload-custom-skill.usecase';
import { VerifyManagedCredentials } from './verify-managed-credentials/verify-managed-credentials.usecase';

export {
  ConfigureTelegramAgentWebhook,
  ConsumeTelegramMobileLink,
  GetTelegramMobileLinkStatus,
  IssueTelegramMobileLink,
  IssueTelegramSubscriberLink,
  LinkTelegramChatToSubscriber,
};

export const USE_CASES = [
  CreateAgent,
  ConfigureTelegramAgentWebhook,
  ConsumeTelegramMobileLink,
  GetAgent,
  GetAgentRuntimeConfig,
  GetTelegramMobileLinkStatus,
  ListAgents,
  UpdateAgent,
  UpdateAgentInboxShared,
  UpdateAgentRuntimeConfig,
  UploadCustomSkill,
  DeleteAgent,
  AddAgentIntegration,
  CleanupNovuEmail,
  ConfigureWhatsAppWebhook,
  FindOrCreateNovuEmail,
  GenerateManagedAgent,
  IssueTelegramMobileLink,
  IssueTelegramSubscriberLink,
  LinkTelegramChatToSubscriber,
  ListAgentEmoji,
  ListAgentIntegrations,
  UpdateAgentIntegration,
  RemoveAgentIntegration,
  HandleAgentReply,
  ProvisionManagedAgent,
  SendAgentTestEmail,
  SendAgentWelcomeMessage,
  SendWhatsAppTestTemplate,
  SyncAgentToEnvironment,
  SyncAgentMcpServers,
  EnableAgentMcpServer,
  DisableAgentMcpServer,
  ListAgentMcpServers,
  GenerateMcpOAuthUrl,
  McpOAuthCallback,
  GetMcpConnectionStatus,
  VerifyManagedCredentials,
];
