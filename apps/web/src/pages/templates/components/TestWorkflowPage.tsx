import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { TestWorkflow } from './TestWorkflow';

export function TestWorkflowPage() {
  const { trigger } = useTemplateEditorForm();

  return <TestWorkflow trigger={trigger} />;
}
