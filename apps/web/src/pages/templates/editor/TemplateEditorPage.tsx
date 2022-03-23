import { FormProvider } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@notifire/shared';
import { useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { TemplatesSideBar } from '../../../components/templates/TemplatesSideBar';
import { NotificationSettingsForm } from '../../../components/templates/NotificationSettingsForm';
import { useTemplateController } from '../../../legacy/pages/templates/editor/use-template-controller.hook';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { TemplateInAppEditor } from '../../../components/templates/in-app-editor/TemplateInAppEditor';
import { TriggerSnippetTabs } from '../../../components/templates/TriggerSnippetTabs';
import { AddChannelsPage } from './AddChannelsPage';
import { Button, Select, Switch } from '../../../design-system';
import { EmailMessagesCards } from '../../../components/templates/email-editor/EmailMessagesCards';
import { TemplateSMSEditor } from '../../../components/templates/TemplateSMSEditor';
import { useStatusChangeControllerHook } from '../../../legacy/pages/templates/editor/use-status-change-controller.hook';

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);

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
          <Group mt={20} align="flex-start" grow>
            <TemplatesSideBar
              activeTab={activePage}
              toggleChannel={toggleChannel}
              changeTab={setActivePage}
              activeChannels={activeChannels}
              channelButtons={channelButtons}
              showTriggerSection={!!template && !!trigger}
              showErrors={methods.formState.isSubmitted && Object.keys(errors).length > 0}
            />
            <Container ml={25} mr={30} fluid padding={0} sx={{ maxWidth: '100%' }}>
              {activePage === 'Settings' && <NotificationSettingsForm editMode={editMode} />}
              {activePage === 'Add' && (
                <AddChannelsPage channelButtons={channelButtons} handleAddChannel={handleAddChannel} />
              )}
              {!loadingEditTemplate ? (
                <div>
                  {activePage === 'sms' &&
                    smsFields.map((message, index) => {
                      return <TemplateSMSEditor key={index} control={control} index={index} errors={errors} />;
                    })}
                  {activePage === 'email' && (
                    <EmailMessagesCards
                      variables={trigger?.variables || []}
                      onRemoveTab={removeEmailMessage}
                      emailMessagesFields={emailMessagesFields}
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
            </Container>
          </Group>
        </form>
      </FormProvider>
    </PageContainer>
  );
}
