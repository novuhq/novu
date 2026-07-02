import { Injectable } from '@nestjs/common';
import { AgentEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { diff } from 'deep-object-diff';

import { IResourceDiff } from '../../../types/sync.types';
import { IBaseComparator } from '../base/interfaces/base-comparator.interface';

type AgentSnapshot = Pick<AgentEntity, 'name' | 'description' | 'behavior'>;

function toSnapshot(agent: AgentEntity): AgentSnapshot {
  return { name: agent.name, description: agent.description, behavior: agent.behavior };
}

@Injectable()
export class AgentComparatorAdapter implements IBaseComparator<AgentEntity> {
  async compareResources(
    sourceResource: AgentEntity,
    targetResource: AgentEntity,
    _: UserSessionData
  ): Promise<{
    resourceChanges: {
      previous: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }> {
    const sourceSnapshot = toSnapshot(sourceResource);
    const targetSnapshot = toSnapshot(targetResource);
    const differences = diff(targetSnapshot, sourceSnapshot);

    if (Object.keys(differences).length === 0) {
      return { resourceChanges: null };
    }

    return {
      resourceChanges: {
        previous: targetSnapshot as Record<string, unknown>,
        new: sourceSnapshot as Record<string, unknown>,
      },
    };
  }
}
