import { StepEditorLayout } from '@/components/workflow-editor/steps/step-editor-layout';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { PageMeta } from '@/components/page-meta';

export function EditStepTemplateV2Page() {
  const { workflow, update, step } = useWorkflow();

  if (!workflow || !step) {
    return null;
  }

  return (
    <>
      <PageMeta title={`Edit ${step.name} Template`} />
      <div className="flex h-full w-full">
        <StepEditorLayout />
      </div>
    </>
  );
}
