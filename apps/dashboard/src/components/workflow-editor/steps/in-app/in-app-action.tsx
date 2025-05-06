import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { InAppActionDropdown } from '@/components/in-app-action-dropdown';

export const InAppAction = () => {
  const { saveForm } = useSaveForm();

  return <InAppActionDropdown onMenuItemClick={saveForm} />;
};
