import { EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';

/**
 * Central edit policy for step content. Content remains visible when this returns true, while every
 * mutating control and autosave path stays locked.
 */
export function useStepContentReadOnly(): boolean {
  const { currentEnvironment, readOnly } = useEnvironment();
  const has = useHasPermission();

  return (
    readOnly ||
    currentEnvironment?.type !== EnvironmentTypeEnum.DEV ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE })
  );
}
