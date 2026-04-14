import { AddAgentIntegration } from './add-agent-integration/add-agent-integration.usecase';
import { CreateAgent } from './create-agent/create-agent.usecase';
import { DeleteAgent } from './delete-agent/delete-agent.usecase';
import { GetAgent } from './get-agent/get-agent.usecase';
import { ListAgentIntegrations } from './list-agent-integrations/list-agent-integrations.usecase';
import { ListAgents } from './list-agents/list-agents.usecase';
import { RemoveAgentIntegration } from './remove-agent-integration/remove-agent-integration.usecase';
import { UpdateAgentIntegration } from './update-agent-integration/update-agent-integration.usecase';
import { UpdateAgent } from './update-agent/update-agent.usecase';

export const USE_CASES = [
  CreateAgent,
  GetAgent,
  ListAgents,
  UpdateAgent,
  DeleteAgent,
  AddAgentIntegration,
  ListAgentIntegrations,
  UpdateAgentIntegration,
  RemoveAgentIntegration,
];
