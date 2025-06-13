import { PreviewContextPanel } from '@/components/workflow-editor/steps/preview-context-panel';
import { useStepEditor } from './step-editor-context';

export function PreviewContextContainer() {
  const { workflow, editorValue, setEditorValue, step } = useStepEditor();

  return (
    <PreviewContextPanel
      workflow={workflow}
      value={editorValue}
      onChange={setEditorValue}
      currentStepId={step.stepId}
    />
  );
}
