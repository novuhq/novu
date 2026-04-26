import { AddAgentIntegration } from './add-agent-integration/add-agent-integration.usecase';
import { CleanupNovuEmail } from './cleanup-novu-email/cleanup-novu-email.usecase';
import { CreateAgent } from './create-agent/create-agent.usecase';
import { DeleteAgent } from './delete-agent/delete-agent.usecase';
import { FindOrCreateNovuEmail } from './find-or-create-novu-email/find-or-create-novu-email.usecase';
import { GetAgent } from './get-agent/get-agent.usecase';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';
import { ListAgentEmoji } from './list-agent-emoji/list-agent-emoji.usecase';
import { ListAgentIntegrations } from './list-agent-integrations/list-agent-integrations.usecase';
import { ListAgents } from './list-agents/list-agents.usecase';
import { RemoveAgentIntegration } from './remove-agent-integration/remove-agent-integration.usecase';
import { SendAgentTestEmail } from './send-agent-test-email/send-agent-test-email.usecase';
import { UpdateAgent } from './update-agent/update-agent.usecase';
import { UpdateAgentIntegration } from './update-agent-integration/update-agent-integration.usecase';

export const USE_CASES = [
  CreateAgent,
  GetAgent,
  ListAgents,
  UpdateAgent,
  DeleteAgent,
  AddAgentIntegration,
  CleanupNovuEmail,
  FindOrCreateNovuEmail,
  ListAgentEmoji,
  ListAgentIntegrations,
  UpdateAgentIntegration,
  RemoveAgentIntegration,
  HandleAgentReply,
  SendAgentTestEmail,
];
