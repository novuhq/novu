import { Injectable } from '@nestjs/common';
import { SnapshotEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { UpsertWorkflowCommand, UpsertWorkflowUseCase } from '../../../workflows-v2/usecases/upsert-workflow';
import { RevertResourceStrategy } from './revert-resource.interface';

@Injectable()
export class WorkflowRevertStrategy implements RevertResourceStrategy {
  constructor(private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase) {}

  async revert(snapshot: SnapshotEntity, user: UserSessionData): Promise<void> {
    await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: snapshot.data as WorkflowResponseDto,
        user,
        workflowIdOrInternalId: snapshot.resourceId,
      })
    );
  }
}
