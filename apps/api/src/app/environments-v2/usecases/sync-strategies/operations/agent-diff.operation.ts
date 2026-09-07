import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentEntity } from '@novu/dal';

import { IUserInfo, ResourceTypeEnum } from '../../../types/sync.types';
import { AgentComparatorAdapter } from '../adapters/agent-comparator.adapter';
import { AgentRepositoryAdapter } from '../adapters/agent-repository.adapter';
import { BaseDiffOperation } from '../base/operations/base-diff.operation';

@Injectable()
export class AgentDiffOperation extends BaseDiffOperation<AgentEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: AgentRepositoryAdapter,
    protected comparatorAdapter: AgentComparatorAdapter
  ) {
    super(logger, repositoryAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.AGENT;
  }

  protected getResourceName(resource: AgentEntity): string {
    return resource.name || resource.identifier;
  }

  protected extractUpdatedByInfo(_resource: AgentEntity): IUserInfo | null {
    return null;
  }

  protected extractUpdatedAtInfo(resource: AgentEntity): string | null {
    return resource.updatedAt ?? null;
  }
}
