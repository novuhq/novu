import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { ReactFlowProvider } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import type { IForm } from '../../../components/templates/formTypes';
import { useActiveIntegrations } from '../../../api/hooks';
import { useEnvController } from '../../../store/useEnvController';
import WorkflowEditorPage from '../workflow/WorkflowEditorPage';
import { TemplateEditor } from '../../../components/templates/TemplateEditor';
import { TemplateSettings } from '../../../components/templates/TemplateSettings';
import { TemplatePageHeader } from '../../../components/templates/TemplatePageHeader';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { usePrompt } from '../../../hooks/usePrompt';
import { UnsavedChangesModal } from '../../../components/templates/UnsavedChangesModal';
import { When } from '../../../components/utils/When';
import { UserPreference } from '../../user-preference/UserPreference';
import { TestWorkflowModal } from '../../../components/templates/TestWorkflowModal';
import { SaveChangesModal } from '../../../components/templates/SaveChangesModal';
import { ExecutionDetailsModalWrapper } from '../../../components/templates/ExecutionDetailsModalWrapper';
import { useSearchParams } from '../../../hooks/useSearchParams';
import { BlueprintModal } from '../../../components/templates/BlueprintModal';
import { useTemplateEditor } from '../../../components/templates/TemplateEditorProvider';
import { errorMessage } from '../../../utils/notifications';

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
    formState: { errors, isDirty },
    handleSubmit,
  } = methods;

  const isCreateTemplatePage = location.pathname === '/templates/create';
  const [showModal, confirmNavigation, cancelNavigation] = usePrompt(isDirty);

  const onInvalid = async (objErrors) => {
    errorMessage(getExplicitStepsErrors(objErrors));
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
          navigate('/templates');
        }
      }
    }
  }, [environment, template]);

  if (environment && environment?.name === 'Production' && isCreateTemplatePage) {
    navigate('/templates');
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
                isCreatingTemplate={isCreating}
                isUpdatingTemplate={isUpdating}
                addStep={addStep}
                deleteStep={deleteStep}
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

export function getExplicitStepsErrors(errors: any) {
  const errorsArray: string[] = [];
  if (errors?.name) {
    errorsArray.push(errors.name?.message);
  }
  if (errors?.notificationGroupId) {
    errorsArray.push(errors.notificationGroupId?.message);
  }
  if (errors?.steps) {
    const errorIndexes = Object.keys(errors?.steps);
    errorIndexes.forEach((index) => {
      const stepErrors = errors?.steps[index]?.template;
      if (stepErrors) {
        const keys = Object.keys(stepErrors);

        errorsArray.push(...keys.map((key) => stepErrors[key]?.message));
      }
      const actionErrors = errors?.steps[index]?.metadata;
      if (actionErrors) {
        const keys = Object.keys(actionErrors);

        errorsArray.push(...keys.map((key) => actionErrors[key]?.message));
      }
    });

    const requiredArraySec = errorsArray
      .filter((errMessage) => errMessage.includes('Required - '))
      .map((errMessage) => errMessage.replace('Required - ', ''))
      .join(', ');

    const actionArraySec = errorsArray.filter((errMessage) => !errMessage.includes('Required - ')).join(', ');

    return [requiredArraySec && 'Required - ' + requiredArraySec, actionArraySec && actionArraySec].join(', ');
    // return Array.from(new Set(errorsArray)).join(', ');
  }

  return 'Something is missing here';
}
