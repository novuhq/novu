import { FormProvider } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import { useState } from 'react';
import { ChannelTypeEnum } from '@notifire/shared';
import { useParams } from 'react-router-dom';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { TemplatesSideBar } from '../../../components/templates/TemplatesSideBar';
import { NotificationSettingsForm } from '../../../components/templates/NotificationSettingsForm';
import { useTemplateController } from '../../../legacy/pages/templates/editor/use-template-controller.hook';
import { TemplateTriggerModal } from '../../../components/templates/TemplateTriggerModal';
import { TriggerSnippetTabs } from '../../../components/templates/TriggerSnippetTabs';
import { AddChannelsPage } from './AddChannelsPage';
import { Button } from '../../../design-system';

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);

  const handleAddChannel = (tabKey) => {
    const foundChannel = channelButtons.find((item) => item === tabKey);
    if (!foundChannel) {
      toggleChannel(ChannelTypeEnum[tabKey], true);

      setChannelButtons((prev) => [...prev, tabKey]);
      setActivePage(tabKey);
    }
  };

  const {
    selectedMessageType,
    editMode,
    template,
    changeSelectedMessage,
    isEmbedModalVisible,
    trigger,
    isLoading,
    isUpdateLoading,
    setValue,
    onSubmit,
    loadingEditTemplate,
    activeChannels,
    toggleChannel,
    onTriggerModalDismiss,
    addMessage,
    handleSubmit,
    control,
    emailMessagesFields,
    inAppFields,
    errors,
    smsFields,
    methods,
    removeEmailMessage,
  } = useTemplateController(templateId);

  return (
    <PageContainer>
      <FormProvider {...methods}>
        <form name="template-form" onSubmit={handleSubmit(onSubmit)}>
          <PageHeader
            title="Create New Template"
            actions={
              <Button
                data-test-id="submit-btn"
                loading={isLoading || isUpdateLoading}
                disabled={loadingEditTemplate || isLoading}
                submit>
                {editMode ? 'Update' : 'Create'}
              </Button>
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
            />
            <Container ml={25} mr={30} fluid padding={0} sx={{ maxWidth: '100%' }}>
              {activePage === 'Settings' && <NotificationSettingsForm errors={errors} editMode={editMode} />}
              {activePage === 'Add' && (
                <AddChannelsPage channelButtons={channelButtons} handleAddChannel={handleAddChannel} />
              )}
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
