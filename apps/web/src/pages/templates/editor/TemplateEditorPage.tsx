import { FormProvider } from 'react-hook-form';
import { Grid, useMantineColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import PageHeader from '../../../components/layout/components/PageHeader';
import { TemplatesSideBar } from '../../../components/templates/TemplatesSideBar';
import { NotificationSettingsForm } from '../../../components/templates/NotificationSettingsForm';
import { useTemplateController } from '../../../components/templates/use-template-controller.hook';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { TemplateInAppEditor } from '../../../components/templates/in-app-editor/TemplateInAppEditor';
import { TriggerSnippetTabs } from '../../../components/templates/TriggerSnippetTabs';
import { Button, colors, Switch } from '../../../design-system';
import { EmailMessagesCards } from '../../../components/templates/email-editor/EmailMessagesCards';
import { TemplateSMSEditor } from '../../../components/templates/TemplateSMSEditor';
import { useActiveIntegrations } from '../../../api/hooks';
import { useStatusChangeControllerHook } from '../../../components/templates/use-status-change-controller.hook';
import { useEnvController } from '../../../store/use-env-controller';
import WorkflowEditorPage from '../workflow/WorkflowEditorPage';
import WorkflowPageHeader from '../../../components/workflow/WorkflowPageHeader';
import { EditorPreviewSwitch } from '../../../components/templates/EditorPreviewSwitch';

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { readonly, environment } = useEnvController();
  const [view, setView] = useState<'Edit' | 'Preview'>('Edit');
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);
  const { integrations, loading: isIntegrationsLoading } = useActiveIntegrations();
  const { colorScheme } = useMantineColorScheme();

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
    isEmbedModalVisible,
    trigger,
    isLoading,
    isUpdateLoading,
    onSubmit,
    loadingEditTemplate,
    activeChannels,
    toggleChannel,
    onTriggerModalDismiss,
    handleSubmit,
    control,
    emailMessagesFields,
    inAppFields,
    errors,
    smsFields,
    methods,
    removeEmailMessage,
    isDirty,
    setIsDirty,
  } = useTemplateController(templateId);

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

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
          {(activePage === 'Settings' || activePage === 'TriggerSnippet') && (
            <>
              <PageHeader
                title={editMode ? 'Edit Template' : 'Create new template'}
                actions={
                  <Grid align="center" gutter={50}>
                    {editMode && (
                      <Grid.Col span={6}>
                        <Switch
                          label={isTemplateActive ? 'Enabled' : 'Disabled'}
                          loading={isStatusChangeLoading}
                          disabled={readonly}
                          data-test-id="active-toggle-switch"
                          onChange={(e) => changeActiveStatus(e.target.checked)}
                          checked={isTemplateActive || false}
                        />
                      </Grid.Col>
                    )}
                    <Grid.Col span={6}>
                      <Button
                        mr={20}
                        data-test-id="submit-btn"
                        loading={isLoading || isUpdateLoading}
                        disabled={readonly || loadingEditTemplate || isLoading || !isDirty}
                        submit
                      >
                        {editMode ? 'Update' : 'Create'}
                      </Button>
                    </Grid.Col>
                  </Grid>
                }
              />
              <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
                <Grid grow style={{ minHeight: 500 }}>
                  <Grid.Col md={4} sm={6}>
                    <SideBarWrapper dark={colorScheme === 'dark'} style={{ paddingRight: 50 }}>
                      <TemplatesSideBar
                        setIsDirty={setIsDirty}
                        activeTab={activePage}
                        toggleChannel={toggleChannel}
                        changeTab={setActivePage}
                        readonly={readonly}
                        activeChannels={activeChannels}
                        channelButtons={channelButtons}
                        showTriggerSection={!!template && !!trigger}
                        showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
                      />
                    </SideBarWrapper>
                  </Grid.Col>
                  <Grid.Col md={8} sm={6}>
                    <div style={{ paddingLeft: 23 }}>
                      {activePage === 'Settings' && <NotificationSettingsForm editMode={editMode} />}

                      {template && trigger && activePage === 'TriggerSnippet' && (
                        <TriggerSnippetTabs trigger={trigger} />
                      )}
                      {trigger && (
                        <TemplateTriggerModal
                          trigger={trigger}
                          onDismiss={onTriggerModalDismiss}
                          isVisible={isEmbedModalVisible}
                        />
                      )}
                    </div>
                  </Grid.Col>
                </Grid>
              </div>
            </>
          )}
          {activePage === 'Workflow' && (
            <WorkflowEditorPage
              handleAddChannel={handleAddChannel}
              channelButtons={channelButtons}
              changeTab={setActivePage}
            />
          )}
          {!loadingEditTemplate && !isIntegrationsLoading ? (
            <div>
              {activePage === 'sms' && (
                <>
                  <WorkflowPageHeader
                    title="Edit SMS Template"
                    onGoBack={goBackHandler}
                    actions={
                      <Button
                        loading={isLoading || isUpdateLoading}
                        disabled={readonly || loadingEditTemplate || isLoading || !isDirty}
                        onClick={() => changeSelectedMessage(ChannelTypeEnum.SMS)}
                      >
                        Save
                      </Button>
                    }
                  >
                    {' '}
                    <EditorPreviewSwitch view={view} setView={setView} />
                  </WorkflowPageHeader>
                  {smsFields.map((message, index) => {
                    return (
                      <TemplateSMSEditor
                        key={index}
                        control={control}
                        index={index}
                        errors={errors}
                        isIntegrationActive={
                          !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.SMS)
                        }
                      />
                    );
                  })}
                </>
              )}
              {activePage === 'email' && (
                <>
                  <WorkflowPageHeader
                    title="Edit Email Template"
                    onGoBack={goBackHandler}
                    actions={
                      <Button
                        loading={isLoading || isUpdateLoading}
                        disabled={readonly || loadingEditTemplate || isLoading || !isDirty}
                        onClick={() => goBackHandler()}
                      >
                        Save
                      </Button>
                    }
                  >
                    {' '}
                    <EditorPreviewSwitch view={view} setView={setView} />
                  </WorkflowPageHeader>
                  <EmailMessagesCards
                    variables={trigger?.variables || []}
                    onRemoveTab={removeEmailMessage}
                    emailMessagesFields={emailMessagesFields}
                    isIntegrationActive={
                      !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.EMAIL)
                    }
                  />
                </>
              )}
              {activePage === 'in_app' && (
                <>
                  <WorkflowPageHeader
                    title="Edit Notification Template"
                    onGoBack={goBackHandler}
                    actions={
                      <Button
                        loading={isLoading || isUpdateLoading}
                        disabled={readonly || loadingEditTemplate || isLoading || !isDirty}
                        onClick={() => changeSelectedMessage(ChannelTypeEnum.IN_APP)}
                      >
                        Save
                      </Button>
                    }
                  >
                    <EditorPreviewSwitch view={view} setView={setView} />
                  </WorkflowPageHeader>
                  {inAppFields.map((message, index) => {
                    return <TemplateInAppEditor key={index} errors={errors} control={control} index={index} />;
                  })}
                </>
              )}
            </div>
          ) : null}
        </form>
      </FormProvider>
    </PageContainer>
  );
}

const SideBarWrapper = styled.div<{ dark: boolean }>`
  border-right: 1px solid ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
  height: 100%;
`;
