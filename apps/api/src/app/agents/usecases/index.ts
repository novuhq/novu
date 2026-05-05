import { AddAgentIntegration } from './add-agent-integration/add-agent-integration.usecase';
import { CleanupNovuEmail } from './cleanup-novu-email/cleanup-novu-email.usecase';
import { CreateAgent } from './create-agent/create-agent.usecase';
import { DeleteAgent } from './delete-agent/delete-agent.usecase';
import { DisconnectSubscriberMcp } from './disconnect-subscriber-mcp/disconnect-subscriber-mcp.usecase';
import { FindOrCreateNovuEmail } from './find-or-create-novu-email/find-or-create-novu-email.usecase';
import { GetAgent } from './get-agent/get-agent.usecase';
import { GetAnthropicAgentCredentials } from './get-anthropic-agent-credentials/get-anthropic-agent-credentials.usecase';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';
import { IssueMcpConnectLink } from './issue-mcp-connect-link/issue-mcp-connect-link.usecase';
import { ListAgentEmoji } from './list-agent-emoji/list-agent-emoji.usecase';
import { ListAgentIntegrations } from './list-agent-integrations/list-agent-integrations.usecase';
import { ListAgents } from './list-agents/list-agents.usecase';
import { ListMcpCatalog } from './list-mcp-catalog/list-mcp-catalog.usecase';
import { ListSharedMcpCredentials } from './list-shared-mcp-credentials/list-shared-mcp-credentials.usecase';
import { ListSubscriberMcpConnections } from './list-subscriber-mcp-connections/list-subscriber-mcp-connections.usecase';
import { RemoveAgentIntegration } from './remove-agent-integration/remove-agent-integration.usecase';
import { RemoveSharedMcpCredential } from './remove-shared-mcp-credential/remove-shared-mcp-credential.usecase';
import { SendAgentTestEmail } from './send-agent-test-email/send-agent-test-email.usecase';
import { SetSharedMcpCredential } from './set-shared-mcp-credential/set-shared-mcp-credential.usecase';
import { SyncAgentToEnvironment } from './sync-agent-to-environment/sync-agent-to-environment.usecase';
import { TestClaudeManagedAgent } from './test-claude-managed-agent/test-claude-managed-agent.usecase';
import { UpdateAgent } from './update-agent/update-agent.usecase';
import { UpdateAgentIntegration } from './update-agent-integration/update-agent-integration.usecase';
import { UpdateAgentMcpServers } from './update-agent-mcp-servers/update-agent-mcp-servers.usecase';
import { UpdateAgentStatus } from './update-agent-status/update-agent-status.usecase';
import { UpdateAnthropicAgentCredentials } from './update-anthropic-agent-credentials/update-anthropic-agent-credentials.usecase';

export const USE_CASES = [
  CreateAgent,
  GetAgent,
  GetAnthropicAgentCredentials,
  ListAgents,
  ListMcpCatalog,
  ListSharedMcpCredentials,
  ListSubscriberMcpConnections,
  UpdateAgent,
  UpdateAgentMcpServers,
  DeleteAgent,
  DisconnectSubscriberMcp,
  AddAgentIntegration,
  CleanupNovuEmail,
  FindOrCreateNovuEmail,
  ListAgentEmoji,
  ListAgentIntegrations,
  UpdateAgentIntegration,
  RemoveAgentIntegration,
  RemoveSharedMcpCredential,
  HandleAgentReply,
  IssueMcpConnectLink,
  SendAgentTestEmail,
  SetSharedMcpCredential,
  SyncAgentToEnvironment,
  TestClaudeManagedAgent,
  UpdateAgentStatus,
  UpdateAnthropicAgentCredentials,
];
