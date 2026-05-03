import { Injectable } from '@nestjs/common';
import { AgentEntity } from '@novu/dal';

import { DeleteAgent } from '../../../../agents/usecases/delete-agent/delete-agent.usecase';
import { DeleteAgentCommand } from '../../../../agents/usecases/delete-agent/delete-agent.command';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseDeleteService } from '../base/interfaces/base-delete.interface';

@Injectable()
export class AgentDeleteAdapter implements IBaseDeleteService<AgentEntity> {
  constructor(private readonly deleteAgent: DeleteAgent) {}

  async deleteResourceFromTarget(context: ISyncContext, resource: AgentEntity): Promise<void> {
    await this.deleteAgent.execute(
      DeleteAgentCommand.create({
        identifier: resource.identifier,
        environmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }
}
