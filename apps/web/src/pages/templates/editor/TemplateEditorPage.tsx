import { FormProvider } from 'react-hook-form';
import { Container, Grid, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@notifire/shared';
import { useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { TemplatesSideBar } from '../../../components/templates/TemplatesSideBar';
import { NotificationSettingsForm } from '../../../components/templates/NotificationSettingsForm';
import { useTemplateController } from '../../../components/templates/use-template-controller.hook';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { TemplateInAppEditor } from '../../../components/templates/in-app-editor/TemplateInAppEditor';
import { TriggerSnippetTabs } from '../../../components/templates/TriggerSnippetTabs';
import { AddChannelsPage } from './AddChannelsPage';
import { Button, colors, Select, Switch } from '../../../design-system';
import { EmailMessagesCards } from '../../../components/templates/email-editor/EmailMessagesCards';
import { TemplateSMSEditor } from '../../../components/templates/TemplateSMSEditor';
import { useActiveIntegrations } from '../../../api/hooks';
import { useStatusChangeControllerHook } from '../../../components/templates/use-status-change-controller.hook';
import styled from '@emotion/styled';

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);
  const { integrations, loading: isIntegrationsLoading } = useActiveIntegrations();

  const handleAddChannel = (tabKey) => {
    const foundChannel = channelButtons.find((item) => item === tabKey);
    if (!foundChannel) {
      changeSelectedMessage(tabKey);
      setChannelButtons((prev) => [...prev, tabKey]);
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

  if (isLoading) return null;

  return (
    <PageContainer>
      <FormProvider {...methods}>
        <form name="template-form" onSubmit={handleSubmit(onSubmit)}>
          <PageHeader
            title={editMode ? 'Edit Template' : 'Create new template'}
            actions={
              <Group grow spacing={40}>
                {editMode && (
                  <Switch
                    label={isTemplateActive ? 'Enabled' : 'Disabled'}
                    loading={isStatusChangeLoading}
                    data-test-id="active-toggle-switch"
                    onChange={(e) => changeActiveStatus(e.target.checked)}
                    checked={isTemplateActive || false}
                  />
                )}
                <Button
                  ml={10}
                  data-test-id="submit-btn"
                  loading={isLoading || isUpdateLoading}
                  disabled={loadingEditTemplate || isLoading}
                  submit>
                  {editMode ? 'Update' : 'Create'}
                </Button>
              </Group>
            }
          />
          <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
            <Grid grow style={{ minHeight: 500 }}>
              <Grid.Col md={4} sm={6}>
                <SideBarWrapper style={{ paddingRight: 50 }}>
                  <TemplatesSideBar
                    activeTab={activePage}
                    toggleChannel={toggleChannel}
                    changeTab={setActivePage}
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
                  {activePage === 'Add' && (
                    <AddChannelsPage channelButtons={channelButtons} handleAddChannel={handleAddChannel} />
                  )}
                  {!loadingEditTemplate && !isIntegrationsLoading ? (
                    <div>
                      {activePage === 'sms' &&
                        smsFields.map((message, index) => {
                          return (
                            <TemplateSMSEditor
                              key={index}
                              control={control}
                              index={index}
                              errors={errors}
                              isIntegrationActive={!!integrations?.some((x) => x.channel === ChannelTypeEnum.SMS)}
                            />
                          );
                        })}
                      {activePage === 'email' && (
                        <EmailMessagesCards
                          variables={trigger?.variables || []}
                          onRemoveTab={removeEmailMessage}
                          emailMessagesFields={emailMessagesFields}
                          isIntegrationActive={!!integrations?.some((x) => x.channel === ChannelTypeEnum.EMAIL)}
                        />
                      )}
                      {activePage === 'in_app' &&
                        inAppFields.map((message, index) => {
                          return <TemplateInAppEditor key={index} errors={errors} control={control} index={index} />;
                        })}
                    </div>
                  ) : null}
                  {template && trigger && activePage === 'TriggerSnippet' && <TriggerSnippetTabs trigger={trigger} />}
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
        </form>
      </FormProvider>
    </PageContainer>
  );
}

const SideBarWrapper = styled.div`
  border-right: 1px solid ${colors.B20};
  height: 100%;
`;

const EditorContentWrapper = styled.div`
  margin-top: 20px;
  display: flex;
  width: 100%;
`;
