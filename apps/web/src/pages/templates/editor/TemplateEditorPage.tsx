import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import { useTemplateController } from '../../../components/templates/use-template-controller.hook';
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

export enum ActivePageEnum {
  SETTINGS = 'Settings',
  WORKFLOW = 'Workflow',
  SMS = 'Sms',
  EMAIL = 'Email',
  IN_APP = 'in_app',
  TRIGGER_SNIPPET = 'TriggerSnippet',
}

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { readonly, environment } = useEnvController();
  const [activeStep, setActiveStep] = useState<string>('');
  const [activePage, setActivePage] = useState<ActivePageEnum>(ActivePageEnum.SETTINGS);
  const { loading: isIntegrationsLoading } = useActiveIntegrations();
  const {
    editMode,
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

  useEffect(() => {
    if (environment && template) {
      if (environment._id !== template._environmentId && template._parentId) {
        navigate(`/templates/edit/${template._parentId}`);
      }
    }
  }, [environment, template]);

  if (isLoading) return null;

  return (
    <>
      <PageContainer>
        <PageMeta title={editMode ? template?.name : 'Create Template'} />
        <form name="template-form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <TemplatePageHeader
            loading={isLoading || isUpdateLoading}
            disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
            templateId={templateId}
            setActivePage={setActivePage}
            activePage={activePage}
          />
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
              <WorkflowEditorPage setActiveStep={setActiveStep} templateId={templateId} setActivePage={setActivePage} />
            </ReactFlowProvider>
          )}
          {!loadingEditTemplate && !isIntegrationsLoading ? (
            <TemplateEditor activeStep={activeStep} activePage={activePage} templateId={templateId} />
          ) : null}
          {trigger && (
            <TemplateTriggerModal trigger={trigger} onDismiss={onTriggerModalDismiss} isVisible={isEmbedModalVisible} />
          )}
        </form>
      </PageContainer>
      <UnsavedChangesModal
        isOpen={showModal}
        cancelNavigation={cancelNavigation}
        confirmNavigation={confirmNavigation}
      />
    </>
  );
}
