import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentEntity } from '@novu/dal';

import { ResourceTypeEnum } from '../../../types/sync.types';
import { AgentComparatorAdapter } from '../adapters/agent-comparator.adapter';
import { AgentDeleteAdapter } from '../adapters/agent-delete.adapter';
import { AgentRepositoryAdapter } from '../adapters/agent-repository.adapter';
import { AgentSyncAdapter } from '../adapters/agent-sync.adapter';
import { BaseSyncOperation } from '../base/operations/base-sync.operation';

@Injectable()
export class AgentSyncOperation extends BaseSyncOperation<AgentEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: AgentRepositoryAdapter,
    protected syncAdapter: AgentSyncAdapter,
    protected deleteAdapter: AgentDeleteAdapter,
    protected comparatorAdapter: AgentComparatorAdapter
  ) {
    super(logger, repositoryAdapter, syncAdapter, deleteAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.AGENT;
  }

  protected getResourceName(resource: AgentEntity): string {
    return resource.name || resource.identifier;
  }
}
