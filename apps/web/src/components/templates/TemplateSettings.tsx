import { Grid, useMantineColorScheme } from '@mantine/core';
import { Button, colors, Switch } from '../../design-system';
import { useEnvController } from '../../store/use-env-controller';
import { NotificationSettingsForm } from './NotificationSettingsForm';
import { TemplatesSideBar } from './TemplatesSideBar';
import { TemplateTriggerModal } from './TemplateTriggerModal';
import { TriggerSnippetTabs } from './TriggerSnippetTabs';
import styled from '@emotion/styled';
import PageHeader from '../layout/components/PageHeader';
import { useStatusChangeControllerHook } from './use-status-change-controller.hook';

export const TemplateSettings = ({
  loading,
  disableSubmit,
  editMode,
  setIsDirty,
  activePage,
  toggleChannel,
  setActivePage,
  activeChannels,
  channelButtons,
  template,
  trigger,
  showErrors,
  onTriggerModalDismiss,
  isEmbedModalVisible,
}) => {
  const { readonly } = useEnvController();
  const { colorScheme } = useMantineColorScheme();

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    template?._id,
    template
  );

  return (
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
              <Button mr={20} data-test-id="submit-btn" loading={loading} disabled={disableSubmit} submit>
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
                showErrors={showErrors}
              />
            </SideBarWrapper>
          </Grid.Col>
          <Grid.Col md={8} sm={6}>
            <div style={{ paddingLeft: 23 }}>
              {activePage === 'Settings' && <NotificationSettingsForm editMode={editMode} />}

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
    </>
  );
};

const SideBarWrapper = styled.div<{ dark: boolean }>`
  border-right: 1px solid ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
  height: 100%;
`;
