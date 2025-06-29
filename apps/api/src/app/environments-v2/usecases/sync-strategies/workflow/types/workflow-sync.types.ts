import { UserSessionData } from '@novu/shared';
import { NotificationTemplateEntity } from '@novu/dal';
import { DiffActionEnum, IResourceDiff } from '../../../../types/sync.types';
import { WorkflowResponseDto } from '../../../../../workflows-v2/dtos/workflow-response.dto';
import { StepResponseDto } from '../../../../../workflows-v2/dtos/step.response.dto';

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
>;

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
    previous: Record<string, any> | null;
    new: Record<string, any> | null;
  } | null;
  stepDiffs: IResourceDiff[];
}
