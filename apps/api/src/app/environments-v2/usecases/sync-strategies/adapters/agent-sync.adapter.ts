import { Injectable } from '@nestjs/common';
import { AgentEntity } from '@novu/dal';

import {
  SyncAgentToEnvironment,
  SyncAgentToEnvironmentCommand,
} from '../../../../agents/usecases/sync-agent-to-environment';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseSyncService } from '../base/interfaces/base-sync.interface';

@Injectable()
export class AgentSyncAdapter implements IBaseSyncService<AgentEntity> {
  constructor(private readonly syncAgentToEnvironment: SyncAgentToEnvironment) {}

  async syncResourceToTarget(context: ISyncContext, resource: AgentEntity): Promise<void> {
    await this.syncAgentToEnvironment.execute(
      SyncAgentToEnvironmentCommand.create({
        agentIdentifier: resource.identifier,
        environmentId: context.sourceEnvironmentId,
        targetEnvironmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }
}
