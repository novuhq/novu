import { Injectable } from '@nestjs/common';
import { AgentEntity, AgentRepository } from '@novu/dal';

import { IBaseRepositoryService } from '../base/interfaces/base-repository.interface';

@Injectable()
export class AgentRepositoryAdapter implements IBaseRepositoryService<AgentEntity> {
  constructor(private readonly agentRepository: AgentRepository) {}

  async fetchSyncableResources(environmentId: string, organizationId: string): Promise<AgentEntity[]> {
    return this.agentRepository.find({ _environmentId: environmentId, _organizationId: organizationId }, '*');
  }

  createResourceMap(resources: AgentEntity[]): Map<string, AgentEntity> {
    return new Map(resources.map((agent) => [agent.identifier, agent]));
  }

  getResourceIdentifier(resource: AgentEntity): string {
    return resource.identifier;
  }
}
