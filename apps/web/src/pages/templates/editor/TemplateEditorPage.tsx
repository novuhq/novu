import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { ReactFlowProvider } from 'react-flow-renderer';
import { FieldErrors, useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import type { IForm } from '../components/formTypes';
import WorkflowEditorPage from '../workflow/WorkflowEditorPage';
import { TemplateEditor } from '../components/TemplateEditor';
import { TemplateSettings } from '../components/TemplateSettings';
import { TemplatePageHeader } from '../components/TemplatePageHeader';
import { TemplateTriggerModal } from '../components/TemplateTriggerModal';
import { usePrompt, useSearchParams, useEnvController, useActiveIntegrations } from '../../../hooks';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';
import { When } from '../../../components/utils/When';
import { UserPreference } from '../../user-preference/UserPreference';
import { TestWorkflowModal } from '../components/TestWorkflowModal';
import { SaveChangesModal } from '../components/SaveChangesModal';
import { ExecutionDetailsModalWrapper } from '../components/ExecutionDetailsModalWrapper';
import { BlueprintModal } from '../components/BlueprintModal';
import { useTemplateEditor } from '../components/TemplateEditorProvider';
import { errorMessage } from '../../../utils/notifications';
import { getExplicitErrors } from '../shared/errors';
import { ROUTES } from '../../../constants/routes.enum';

export enum ActivePageEnum {
  SETTINGS = 'Settings',
  WORKFLOW = 'Workflow',
  USER_PREFERENCE = 'UserPreference',
  SMS = 'Sms',
  EMAIL = 'Email',
  IN_APP = 'in_app',
  PUSH = 'Push',
  CHAT = 'Chat',
  TRIGGER_SNIPPET = 'TriggerSnippet',
}

export const EditorPages = [
  ActivePageEnum.CHAT,
  ActivePageEnum.SMS,
  ActivePageEnum.PUSH,
  ActivePageEnum.EMAIL,
  ActivePageEnum.IN_APP,
];

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { readonly, environment } = useEnvController();
  const [transactionId, setTransactionId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [activePage, setActivePage] = useState<ActivePageEnum>(ActivePageEnum.SETTINGS);
  const [isTriggerModalVisible, setTriggerModalVisible] = useState(false);
  const onTriggerModalDismiss = () => {
    navigate('/templates');
  };
  const { loading: isIntegrationsLoading } = useActiveIntegrations();
  const {
    template,
    isLoading,
    isCreating,
    isUpdating,
    editMode,
    createdTemplateId,
    trigger,
    onSubmit,
    addStep,
    deleteStep,
  } = useTemplateEditor();
  const methods = useFormContext<IForm>();
  const {
    formState: { isDirty },
    handleSubmit,
  } = methods;

  const isCreateTemplatePage = location.pathname === ROUTES.TEMPLATES_CREATE;
  const [showModal, confirmNavigation, cancelNavigation] = usePrompt(isDirty);

  const onInvalid = async (errors: FieldErrors<IForm>) => {
    errorMessage(getExplicitErrors(errors));
  };

  const [testWorkflowModalOpened, { close: closeTestWorkflowModal, open: openTestWorkflowModal }] = useDisclosure(
    false,
    {
      onClose() {
        if (!editMode) {
          navigate(`/templates/edit/${createdTemplateId}`);
        }
      },
    }
  );
  const [saveChangesModalOpened, { close: closeSaveChangesModal, open: openSaveChangesModal }] = useDisclosure(false);
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

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
    openTestWorkflowModal();
  };

  const onSubmitHandler = async (data: IForm) => {
    await onSubmit(data, {
      onCreateSuccess: () => {
        setTriggerModalVisible(true);
      },
    });
  };

  const onTestWorkflowClicked = () => {
    if (isDirty) {
      openSaveChangesModal();
    } else {
      openTestWorkflowModal();
    }
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
      <PageContainer>
        <PageMeta title={editMode ? template?.name : 'Create Template'} />
        <form
          name="template-form"
          noValidate
          onSubmit={handleSubmit(onSubmitHandler, onInvalid)}
          style={{ minHeight: '100%' }}
        >
          <When truthy={activePage !== ActivePageEnum.WORKFLOW}>
            <TemplatePageHeader
              loading={isCreating || isUpdating}
              disableSubmit={readonly || isLoading || isCreating || !isDirty}
              templateId={templateId}
              setActivePage={setActivePage}
              activePage={activePage}
              onTestWorkflowClicked={onTestWorkflowClicked}
            />
          </When>

          {(activePage === ActivePageEnum.SETTINGS || activePage === ActivePageEnum.TRIGGER_SNIPPET) && (
            <TemplateSettings activePage={activePage} setActivePage={setActivePage} templateId={templateId} />
          )}

          {activePage === ActivePageEnum.WORKFLOW && (
            <ReactFlowProvider>
              <WorkflowEditorPage
                activePage={activePage}
                activeStep={activeStep}
                setActiveStep={setActiveStep}
                templateId={templateId}
                setActivePage={setActivePage}
                onTestWorkflowClicked={onTestWorkflowClicked}
                isCreatingTemplate={isCreating}
                isUpdatingTemplate={isUpdating}
                addStep={addStep}
                deleteStep={deleteStep}
              />
            </ReactFlowProvider>
          )}

          <When truthy={activePage === ActivePageEnum.USER_PREFERENCE}>
            <UserPreference activePage={activePage} setActivePage={setActivePage} />
          </When>
          {!isLoading && !isIntegrationsLoading ? (
            <TemplateEditor activeStep={activeStep} activePage={activePage} templateId={templateId} />
          ) : null}
          {trigger && (
            <TemplateTriggerModal
              trigger={trigger}
              onDismiss={onTriggerModalDismiss}
              isVisible={!saveChangesModalOpened && !testWorkflowModalOpened && isTriggerModalVisible}
            />
          )}
          {trigger && !isDirty && (
            <TestWorkflowModal
              trigger={trigger}
              setTransactionId={setTransactionId}
              onDismiss={closeTestWorkflowModal}
              isVisible={testWorkflowModalOpened}
              openExecutionModal={openExecutionModal}
            />
          )}
        </form>
      </PageContainer>
      <SaveChangesModal
        onConfirm={onConfirmSaveChanges}
        isVisible={saveChangesModalOpened}
        onDismiss={closeSaveChangesModal}
        loading={isCreating || isUpdating}
        onInvalid={onInvalid}
      />
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
      <UnsavedChangesModal
        isOpen={showModal}
        cancelNavigation={cancelNavigation}
        confirmNavigation={confirmNavigation}
      />
      <BlueprintModal />
    </>
  );
}
