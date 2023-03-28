import { useParams } from 'react-router-dom';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

export const useBasePath = () => {
  const { editMode } = useTemplateEditorForm();
  const { templateId = '' } = useParams<{ templateId: string }>();

  return editMode ? `/templates/edit/${templateId}` : '/templates/create';
};
