import { StepResponseDto } from '../../../../workflows-v2/dtos/step.response.dto';
import { WorkflowResponseDto } from '../../../../workflows-v2/dtos/workflow-response.dto';
import { IResourceDiff } from '../../../types/sync.types';

export type INormalizedWorkflow = Omit<
  WorkflowResponseDto,
  | '_id' // Auto-generated database ID
  | 'slug' // Auto-generated from name
  | 'updatedAt' // System timestamp
  | 'createdAt' // System timestamp
  | 'origin' // Not relevant for comparison
  | 'status' // Runtime status, not part of definition
  | 'issues' // Runtime issues, not part of definition
  | 'lastTriggeredAt' // Runtime data
  | 'payloadExample' // Auto-generated from schema
  | 'steps' // Override with normalized steps
> & {
  steps: INormalizedStep[];
};

export type INormalizedStep = Omit<
  StepResponseDto,
  | '_id' // Auto-generated database ID
  | 'slug' // Auto-generated from name
  | 'origin' // Not relevant for comparison
  | 'workflowId' // Parent reference
  | 'workflowDatabaseId' // Parent reference
  | 'issues' // Runtime issues
  | 'controls' // We use controlValues instead
  | 'variables' // Schema definition, not values
>;

export interface IWorkflowComparison {
  workflowChanges: {
    previous: Partial<INormalizedWorkflow> | null;
    new: Partial<INormalizedWorkflow> | null;
  } | null;
  otherDiffs: IResourceDiff[];
}
