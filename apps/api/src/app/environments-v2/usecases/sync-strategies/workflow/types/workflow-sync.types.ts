import { DiffActionEnum, IEntityDiff } from '../../../../types/sync.types';

export interface INormalizedWorkflow {
  workflowId: string;
  name: string;
  active: boolean;
  tags: string[];
  description?: string;
  payloadSchema?: Record<string, any>;
  validatePayload?: boolean;
  steps: INormalizedStep[];
  preferences?: any;
}

export interface INormalizedStep {
  stepId: string;
  name: string;
  type: string;
  active: boolean;
  shouldStopOnFail?: boolean;
  filters?: any;
  controlValues?: Record<string, any>;
}

export interface IWorkflowComparison {
  workflowChanges: Record<string, IFieldChange>;
  stepDiffs: IEntityDiff[];
}

export interface IFieldChange {
  previous: any;
  new: any;
}

export interface IWorkflowNormalizer {
  normalizeWorkflow(workflow: any): INormalizedWorkflow;
  normalizeStep(step: any): INormalizedStep;
}

export interface IWorkflowComparator {
  compareWorkflows(source: any, target: any, userContext: any): Promise<IWorkflowComparison>;
  compareStepsAsEntities(
    sourceSteps: INormalizedStep[],
    targetSteps: INormalizedStep[],
    workflowId: string,
    workflowName: string
  ): IEntityDiff[];
}
