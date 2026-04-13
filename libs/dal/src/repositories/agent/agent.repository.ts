import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { AgentDBModel, AgentEntity } from './agent.entity';
import { Agent } from './agent.schema';

export class AgentRepository extends BaseRepositoryV2<AgentDBModel, AgentEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Agent, AgentEntity);
  }
}
