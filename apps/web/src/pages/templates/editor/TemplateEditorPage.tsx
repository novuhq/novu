import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { ReactFlowProvider } from 'react-flow-renderer';
import { FieldErrors, useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import type { IForm } from '../components/formTypes';
import WorkflowEditor from '../workflow/WorkflowEditor';
import { useEnvController } from '../../../hooks';
import { SaveChangesModal } from '../components/SaveChangesModal';
import { BlueprintModal } from '../components/BlueprintModal';
import { TemplateEditorFormProvider, useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { errorMessage } from '../../../utils/notifications';
import { getExplicitErrors } from '../shared/errors';
import { ROUTES } from '../../../constants/routes.enum';
import { TourProvider } from './TourProvider';

function BaseTemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { environment } = useEnvController();
  const { template, isCreating, isUpdating, onSubmit } = useTemplateEditorForm();
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;

  const isCreateTemplatePage = location.pathname === ROUTES.TEMPLATES_CREATE;

  const onInvalid = async (errors: FieldErrors<IForm>) => {
    errorMessage(getExplicitErrors(errors));
  };

  const [saveChangesModalOpened, { close: closeSaveChangesModal, open: openSaveChangesModal }] = useDisclosure(false);

  const onConfirmSaveChanges = async (data: IForm) => {
    await onSubmit(data);
    closeSaveChangesModal();
  };

  const onSubmitHandler = async (data: IForm) => {
    await onSubmit(data);
  };

  useEffect(() => {
    if (environment && template) {
      if (environment._id !== template._environmentId) {
        if (template._parentId) {
          navigate(`/templates/edit/${template._parentId}`);
        } else {
          navigate(ROUTES.TEMPLATES);
        }
      }
    }
  }, [environment, template]);

  if (environment && environment?.name === 'Production' && isCreateTemplatePage) {
    navigate(ROUTES.TEMPLATES);
  }

  if (isCreating) return null;

  return (
    <>
      <TourProvider />
      <PageContainer>
        <PageMeta title={template?.name ?? 'Create Template'} />
        <form
          name="template-form"
          noValidate
          onSubmit={handleSubmit(onSubmitHandler, onInvalid)}
          style={{ minHeight: '100%' }}
        >
          <ReactFlowProvider>
            <WorkflowEditor />
          </ReactFlowProvider>
        </form>
      </PageContainer>
      <SaveChangesModal
        onConfirm={onConfirmSaveChanges}
        isVisible={saveChangesModalOpened}
        onDismiss={closeSaveChangesModal}
        loading={isCreating || isUpdating}
        onInvalid={onInvalid}
      />
      <BlueprintModal />
    </>
  );
}

export default function TemplateEditorPage() {
  return (
    <TemplateEditorFormProvider>
      <BaseTemplateEditorPage />
    </TemplateEditorFormProvider>
  );
}
