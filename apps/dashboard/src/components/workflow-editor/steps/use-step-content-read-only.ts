import {
  EnvironmentTypeEnum,
  PermissionsEnum,
  ResourceOriginEnum,
  type StepResponseDto,
  type WorkflowResponseDto,
} from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';

/**
 * Central edit policy for step content authored in the dashboard. Content remains visible when this
 * returns true, while every mutating control and autosave path stays locked.
 *
 * Framework workflows and code steps are excluded: their content lives in code and the dashboard
 * only edits control values, which stay writable in every environment.
 */
export function useStepContentReadOnly(workflow: WorkflowResponseDto, step: StepResponseDto): boolean {
  const { currentEnvironment, readOnly } = useEnvironment();
  const has = useHasPermission();

  if (workflow.origin === ResourceOriginEnum.EXTERNAL || step.stepResolverHash) {
    return false;
  }

  return (
    readOnly ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE })
  );
}
