import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { ReactFlowProvider } from 'react-flow-renderer';
import { FieldErrors, useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import type { IForm } from '../components/formTypes';
import WorkflowEditor from '../workflow/WorkflowEditor';
import { useSearchParams, useEnvController } from '../../../hooks';
import { SaveChangesModal } from '../components/SaveChangesModal';
import { BlueprintModal } from '../components/BlueprintModal';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { errorMessage } from '../../../utils/notifications';
import { getExplicitErrors } from '../shared/errors';
import { ROUTES } from '../../../constants/routes.enum';
import { ActivePageEnum } from '../../../constants/editorEnums';
import { useTemplateEditorContext } from './TemplateEditorProvider';
import { TourProvider } from './TourProvider';

export const EditorPages = [
  ActivePageEnum.CHAT,
  ActivePageEnum.SMS,
  ActivePageEnum.PUSH,
  ActivePageEnum.EMAIL,
  ActivePageEnum.IN_APP,
];

export default function TemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { environment } = useEnvController();
  const [isTriggerModalVisible, setTriggerModalVisible] = useState(false);
  const { template, isCreating, isUpdating, editMode, onSubmit } = useTemplateEditorForm();
  const { setActivePage } = useTemplateEditorContext();
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;

  const isCreateTemplatePage = location.pathname === ROUTES.TEMPLATES_CREATE;

  const onInvalid = async (errors: FieldErrors<IForm>) => {
    errorMessage(getExplicitErrors(errors));
  };

  const [saveChangesModalOpened, { close: closeSaveChangesModal, open: openSaveChangesModal }] = useDisclosure(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    const page = searchParams.page;
    if (page !== ActivePageEnum.WORKFLOW) {
      return;
    }

    setActivePage(page);
  }, [searchParams.page]);

  const onConfirmSaveChanges = async (data: IForm) => {
    await onSubmit(data);
    closeSaveChangesModal();
  };

  const onSubmitHandler = async (data: IForm) => {
    await onSubmit(data, {
      onCreateSuccess: () => {
        setTriggerModalVisible(true);
      },
    });
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
        <PageMeta title={editMode ? template?.name : 'Create Template'} />
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
