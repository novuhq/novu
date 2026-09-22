import { InAppActionDropdown } from '@/components/in-app-action-dropdown';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

export const InAppAction = () => {
  const { saveForm } = useSaveForm();
  const { isReadOnly } = useStepEditor();

  return <InAppActionDropdown onMenuItemClick={saveForm} readOnly={isReadOnly} />;
};
