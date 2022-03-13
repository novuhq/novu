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
import { AddChannelsPage } from './AddChannelsPage';
import { Button } from '../../../design-system';

interface IUserChannel {
  tabKey: string;
  channelType: ChannelTypeEnum;
  active: boolean;
}

export default function TemplateEditorPage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const [activePage, setActivePage] = useState<string>('Settings');
  const [channelButtons, setChannelButtons] = useState<string[]>([]);

  const handleAddChannel = (tabKey) => {
    changeSelectedMessage(ChannelTypeEnum[tabKey]);

    setChannelButtons((prev) => [...prev, tabKey]);
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
          <PageHeader title="Create New Template" actions={<Button submit>Create</Button>} />
          <Group mt={20} align="flex-start" grow>
            <TemplatesSideBar
              activeTab={activePage}
              toggleChannel={toggleChannel}
              changeTab={setActivePage}
              activeChannels={activeChannels}
              channelButtons={channelButtons}
            />
            <Container ml={25} mr={30} fluid padding={0} sx={{ maxWidth: '100%' }}>
              {activePage === 'Settings' && <NotificationSettingsForm errors={errors} editMode={editMode} />}
              {activePage === 'Add' && <AddChannelsPage handleAddChannel={handleAddChannel} />}
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
