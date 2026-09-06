import { EnvironmentTypeEnum, PermissionsEnum, ResourceOriginEnum } from '@novu/shared';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';

type UseStepContentReadOnlyOptions = {
  /**
   * Framework workflows keep an explicit override path in Development. Pass false from that
   * control so code-defined defaults can still be overridden without unlocking native editors.
   */
  lockExternal?: boolean;
};

/**
 * Central edit policy for native step content. Content remains visible when this returns true,
 * while every mutating control and autosave path stays locked.
 */
export function useStepContentReadOnly({ lockExternal = true }: UseStepContentReadOnlyOptions = {}): boolean {
  const { currentEnvironment, readOnly } = useEnvironment();
  const { workflow } = useWorkflow();
  const has = useHasPermission();
  const isExternal = workflow?.origin === ResourceOriginEnum.EXTERNAL;

  return (
    readOnly ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    (lockExternal && isExternal)
  );
}
