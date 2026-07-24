import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Raised when a webhook or outbound flow targets an integration whose link to
 * the agent was deliberately disconnected (tombstoned). The inbound controller
 * maps this to a 200 response so chat platforms stop retrying delivery.
 */
export class AgentIntegrationDisconnectedException extends UnprocessableEntityException {
  constructor(agentId: string, integrationIdentifier: string) {
    super(`Integration ${integrationIdentifier} is disconnected from agent ${agentId}`);
  }
}
