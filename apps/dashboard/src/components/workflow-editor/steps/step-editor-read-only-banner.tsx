import { EnvironmentTypeEnum } from '@novu/shared';
import { RiArrowRightSLine, RiLockLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useSwitchToDevelopment } from '@/components/workflow-editor/use-switch-to-development';
import { useEnvironment } from '@/context/environment/hooks';

export const StepEditorReadOnlyBanner = () => {
  const { currentEnvironment } = useEnvironment();
  const { workflow, isReadOnly } = useStepEditor();
  const { developmentEnvironment, switchToDevelopment } = useSwitchToDevelopment(workflow.workflowId);

  if (!isReadOnly || !currentEnvironment || currentEnvironment.type === EnvironmentTypeEnum.DEV) {
    return null;
  }

  return (
    <div className="border-stroke-soft bg-bg-weak flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
      <RiLockLine className="text-text-soft size-3.5 shrink-0" />
      <p className="text-text-sub min-w-0 flex-1 text-xs">
        Viewing {currentEnvironment?.name ?? 'this environment'} content. Editing is only available in development.
      </p>
      {developmentEnvironment && (
        <Button
          variant="secondary"
          mode="ghost"
          size="2xs"
          type="button"
          onClick={switchToDevelopment}
          trailingIcon={RiArrowRightSLine}
        >
          Switch to {developmentEnvironment.name}
        </Button>
      )}
    </div>
  );
};
