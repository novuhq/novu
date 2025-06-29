import { UserSessionData } from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';
import { DiffActionEnum, IResourceDiff } from '../../../../types/sync.types';
import { WorkflowResponseDto } from '../../../../../workflows-v2/dtos/workflow-response.dto';
import { StepResponseDto } from '../../../../../workflows-v2/dtos/step.response.dto';

export type INormalizedWorkflow = Pick<
  WorkflowResponseDto,
  | 'workflowId'
  | 'name'
  | 'active'
  | 'tags'
  | 'description'
  | 'payloadSchema'
  | 'validatePayload'
  | 'steps'
  | 'preferences'
>;

export type INormalizedStep = Pick<StepResponseDto, 'stepId' | 'name' | 'type' | 'controlValues'>;

export interface IWorkflowComparison {
  workflowChanges: {
    previous: Record<string, any> | null;
    new: Record<string, any> | null;
  } | null;
  stepDiffs: IResourceDiff[];
}

export interface IWorkflowNormalizer {
  normalizeWorkflow(workflow: WorkflowResponseDto): INormalizedWorkflow;
  normalizeStep(step: StepResponseDto): INormalizedStep;
}

export interface IWorkflowComparator {
  compareWorkflows(
    source: NotificationTemplateEntity,
    target: NotificationTemplateEntity,
    userContext: UserSessionData
  ): Promise<IWorkflowComparison>;
  compareStepsAsEntities(sourceSteps: INormalizedStep[], targetSteps: INormalizedStep[]): IResourceDiff[];
}
