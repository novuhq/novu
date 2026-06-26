import { AddAgentIntegration } from '../channels/integrations/add-agent-integration/add-agent-integration.usecase';
import { ListAgentIntegrations } from '../channels/integrations/list-agent-integrations/list-agent-integrations.usecase';
import { RemoveAgentIntegration } from '../channels/integrations/remove-agent-integration/remove-agent-integration.usecase';
import { UpdateAgentIntegration } from '../channels/integrations/update-agent-integration/update-agent-integration.usecase';
import { ConsumeSlackSetupLink } from '../channels/slack-linking/consume-slack-setup-link/consume-slack-setup-link.usecase';
import { GetSlackSetupLinkStatus } from '../channels/slack-linking/get-slack-setup-link-status/get-slack-setup-link-status.usecase';
import { IssueSlackSetupLink } from '../channels/slack-linking/issue-slack-setup-link/issue-slack-setup-link.usecase';
import { ConfigureWhatsAppWebhook } from '../channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { SendWhatsAppTestTemplate } from '../channels/whatsapp/send-whatsapp-test-template/send-whatsapp-test-template.usecase';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgress } from '../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { SendAgentWelcomeMessage } from '../conversation-runtime/reply/send-agent-welcome-message/send-agent-welcome-message.usecase';
import { SendAgentTestEmail } from '../email/send-agent-test-email/send-agent-test-email.usecase';
import { ConfirmToolApproval } from '../managed-runtime/tool-approval/confirm-tool-approval.usecase';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import { HandleNovuTools } from '../managed-runtime/tool-connect/handle-novu-tools.usecase';
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
import { DisableAgentMcpServer } from '../mcp/enablement/disable-agent-mcp-server/disable-agent-mcp-server.usecase';
import { EnableAgentMcpServer } from '../mcp/enablement/enable-agent-mcp-server/enable-agent-mcp-server.usecase';
import { ListAgentMcpServers } from '../mcp/enablement/list-agent-mcp-servers/list-agent-mcp-servers.usecase';
import { SetAgentMcpServers } from '../mcp/enablement/set-agent-mcp-servers/set-agent-mcp-servers.usecase';
import { GenerateMcpOAuthUrl } from '../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { McpOAuthCallback } from '../mcp/oauth/mcp-oauth-callback/mcp-oauth-callback.usecase';
import { ListAgentEmoji } from '../shared/emoji/list-agent-emoji/list-agent-emoji.usecase';

export { ConsumeSlackSetupLink, GetSlackSetupLinkStatus, IssueSlackSetupLink };

export const USE_CASES = [
  CreateAgent,
  ConsumeSlackSetupLink,
  GetAgent,
  GetAgentRuntimeConfig,
  GetSlackSetupLinkStatus,
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
  EnableAgentMcpServer,
  DisableAgentMcpServer,
  SetAgentMcpServers,
  ListAgentMcpServers,
  GenerateMcpOAuthUrl,
  EnsureProviderManagedVault,
  CompleteProviderManagedRedirect,
  McpOAuthCallback,
  GetMcpConnectionStatus,
  VerifyManagedCredentials,
  HandlePendingToolApprovals,
  ConfirmToolApproval,
  HandleNovuTools,
];
