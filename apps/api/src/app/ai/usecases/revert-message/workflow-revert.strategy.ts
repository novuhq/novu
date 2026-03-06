import { Injectable } from '@nestjs/common';
import {
  StepResponseDto,
  UpsertWorkflowCommand,
  UpsertWorkflowUseCase,
  WorkflowResponseDto,
} from '@novu/application-generic';
import { SnapshotEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { RevertResourceStrategy } from './revert-resource.interface';

@Injectable()
export class WorkflowRevertStrategy implements RevertResourceStrategy {
  constructor(private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase) {}

  async revert(snapshot: SnapshotEntity, user: UserSessionData): Promise<void> {
    const workflowData = snapshot.data as WorkflowResponseDto;

    await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...workflowData,
          steps: workflowData.steps.map(this.mapStepForRevert),
        },
        user,
        workflowIdOrInternalId: snapshot.resourceId,
      })
    );
  }

  private mapStepForRevert(step: StepResponseDto) {
    return {
      name: step.name,
      type: step.type,
      controlValues: step.controlValues ?? step.controls?.values ?? {},
      stepId: step.stepId,
    };
  }
}
