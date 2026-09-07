import { RiArrowRightSLine, RiLockLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useStepEditor } from './context/step-editor-context';

export const StepEditorUnavailable = () => {
  const navigate = useNavigate();
  const { switchEnvironment, oppositeEnvironment } = useEnvironment();
  const { workflow } = useStepEditor();

  const handleSwitchToDevelopment = () => {
    const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

    if (developmentEnvironment?.slug) {
      switchEnvironment(developmentEnvironment.slug);
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: developmentEnvironment.slug,
          workflowSlug: workflow.workflowId,
        })
      );
    }
  };

  const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="flex justify-center">
          <div className="bg-neutral-alpha-50 rounded-full p-3">
            <RiLockLine className="text-neutral-alpha-400 h-8 w-8" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-medium text-neutral-600">Step editor unavailable</h3>
          <p className="text-sm leading-relaxed text-neutral-500">
            Step editing is only available in development environments. Switch to a development environment to modify
            this step.
          </p>
        </div>
        {developmentEnvironment && (
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              size="xs"
              mode="gradient"
              onClick={handleSwitchToDevelopment}
              trailingIcon={RiArrowRightSLine}
            >
              Switch to {developmentEnvironment.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
