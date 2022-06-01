import { FormProvider } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
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

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { readonly, environment } = useEnvController();
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);
  const { loading: isIntegrationsLoading } = useActiveIntegrations();

  const handleAddChannel = (tabKey) => {
    const foundChannel = channelButtons.find((item) => item === tabKey);
    if (!foundChannel) {
      changeSelectedMessage(tabKey);
      setChannelButtons((prev) => [...prev, tabKey]);
      setActivePage(tabKey);
    } else {
      setActivePage(tabKey);
    }
  };

  const {
    editMode,
    template,
    changeSelectedMessage,
    isLoading,
    isUpdateLoading,
    onSubmit,
    loadingEditTemplate,
    activeChannels,
    toggleChannel,
    handleSubmit,
    errors,
    methods,
    isDirty,
  } = useTemplateController(templateId);

  useEffect(() => {
    if (template) {
      for (const key in activeChannels) {
        if (activeChannels[key]) {
          toggleChannel(ChannelTypeEnum[key], true);

          setChannelButtons((prev) => [...prev, key]);
        }
      }
    }
  }, [template]);

  useEffect(() => {
    if (environment && template) {
      if (environment._id !== template._environmentId && template._parentId) {
        navigate(`/templates/edit/${template._parentId}`);
      }
    }
  }, [environment, template]);

  const goBackHandler = () => {
    setActivePage('Workflow');
  };

  if (isLoading) return null;

  return (
    <PageContainer>
      <PageMeta title={editMode ? template?.name : 'Create Template'} />
      <FormProvider {...methods}>
        <form name="template-form" onSubmit={handleSubmit(onSubmit)}>
          <TemplatePageHeader
            loading={isLoading || isUpdateLoading}
            disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
            templateId={templateId}
            setActivePage={setActivePage}
            activePage={activePage}
          />
          {(activePage === 'Settings' || activePage === 'TriggerSnippet') && (
            <TemplateSettings
              activePage={activePage}
              setActivePage={setActivePage}
              showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
              templateId={templateId}
            />
          )}
          {activePage === 'Workflow' && (
            <WorkflowEditorPage
              handleAddChannel={handleAddChannel}
              channelButtons={channelButtons}
              toggleChannel={toggleChannel}
              activeChannels={activeChannels}
            />
          )}
          {!loadingEditTemplate && !isIntegrationsLoading ? (
            <TemplateEditor
              activePage={activePage}
              disableSave={readonly || loadingEditTemplate || isLoading || !isDirty}
              loading={isLoading || isUpdateLoading}
              templateId={templateId}
            />
          ) : null}
        </form>
      </FormProvider>
    </PageContainer>
  );
}
