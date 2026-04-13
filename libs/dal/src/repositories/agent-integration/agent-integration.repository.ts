import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { AgentIntegrationDBModel, AgentIntegrationEntity } from './agent-integration.entity';
import { AgentIntegration } from './agent-integration.schema';

export class AgentIntegrationRepository extends BaseRepositoryV2<
  AgentIntegrationDBModel,
  AgentIntegrationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(AgentIntegration, AgentIntegrationEntity);
  }
}
