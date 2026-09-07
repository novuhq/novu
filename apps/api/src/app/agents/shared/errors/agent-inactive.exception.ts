import { UnprocessableEntityException } from '@nestjs/common';

export class AgentInactiveException extends UnprocessableEntityException {
  constructor(agentId: string) {
    super(`Agent ${agentId} is inactive`);
  }
}
