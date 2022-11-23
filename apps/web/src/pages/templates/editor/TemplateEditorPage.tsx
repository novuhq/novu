import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import { IForm, useTemplateController } from '../../../components/templates/use-template-controller.hook';
import { useActiveIntegrations } from '../../../api/hooks';
import { useEnvController } from '../../../store/use-env-controller';
import WorkflowEditorPage from '../workflow/WorkflowEditorPage';
import { TemplateEditor } from '../../../components/templates/TemplateEditor';
import { TemplateSettings } from '../../../components/templates/TemplateSettings';
import { TemplatePageHeader } from '../../../components/templates/TemplatePageHeader';
import { ReactFlowProvider } from 'react-flow-renderer';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { usePrompt } from '../../../hooks/use-prompt';
import { UnsavedChangesModal } from '../../../components/templates/UnsavedChangesModal';
import { When } from '../../../components/utils/When';
import { UserPreference } from '../../user-preference/UserPreference';
import { TestWorkflowModal } from '../../../components/templates/TestWorkflowModal';
import { SaveChangesModal } from '../../../components/templates/SaveChangesModal';
import { useDisclosure } from '@mantine/hooks';
import { ExecutionDetailsModalWrapper } from '../../../components/templates/ExecutionDetailsModalWrapper';

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

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { readonly, environment } = useEnvController();
  const [transactionId, setTransactionId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [activePage, setActivePage] = useState<ActivePageEnum>(ActivePageEnum.SETTINGS);
  const { loading: isIntegrationsLoading } = useActiveIntegrations();
  const {
    editMode,
    onTestWorkflowDismiss,
    template,
    isLoading,
    isUpdateLoading,
    onSubmit,
    loadingEditTemplate,
    handleSubmit,
    errors,
    methods,
    isDirty,
    isEmbedModalVisible,
    trigger,
    onTriggerModalDismiss,
  } = useTemplateController(templateId);

  const [showModal, confirmNavigation, cancelNavigation] = usePrompt(isDirty);

  const [testWorkflowModalOpened, { close: closeTestWorkflowModal, open: openTestWorkflowModal }] = useDisclosure(
    false,
    {
      onClose() {
        onTestWorkflowDismiss();
      },
    }
  );
  const [saveChangesModalOpened, { close: closeSaveChangesModal, open: openSaveChangesModal }] = useDisclosure(false);
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

  const onConfirmSaveChanges = async (data: IForm) => {
    await onSubmit(data);
    closeSaveChangesModal();
    openTestWorkflowModal();
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
          navigate('/templates/');
        }
      }
    }
  }, [environment, template]);

  if (isLoading) return null;

  return (
    <>
      <PageContainer>
        <PageMeta title={editMode ? template?.name : 'Create Template'} />
        <form name="template-form" noValidate onSubmit={handleSubmit(onSubmit)} style={{ minHeight: '100%' }}>
          <When truthy={activePage !== ActivePageEnum.WORKFLOW}>
            <TemplatePageHeader
              loading={isLoading || isUpdateLoading}
              disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
              templateId={templateId}
              setActivePage={setActivePage}
              activePage={activePage}
              onTestWorkflowClicked={onTestWorkflowClicked}
            />
          </When>

          {(activePage === ActivePageEnum.SETTINGS || activePage === ActivePageEnum.TRIGGER_SNIPPET) && (
            <TemplateSettings
              activePage={activePage}
              setActivePage={setActivePage}
              showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
              templateId={templateId}
            />
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
              />
            </ReactFlowProvider>
          )}

          <When truthy={activePage === ActivePageEnum.USER_PREFERENCE}>
            <UserPreference
              activePage={activePage}
              setActivePage={setActivePage}
              showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
              templateId={templateId}
            />
          </When>

          {!loadingEditTemplate && !isIntegrationsLoading ? (
            <TemplateEditor activeStep={activeStep} activePage={activePage} templateId={templateId} />
          ) : null}
          {trigger && (
            <TemplateTriggerModal
              trigger={trigger}
              onDismiss={onTriggerModalDismiss}
              isVisible={!saveChangesModalOpened && !testWorkflowModalOpened && isEmbedModalVisible}
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
        loading={isLoading || isUpdateLoading}
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
    </>
  );
}
