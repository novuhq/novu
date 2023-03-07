import { Center, Container, Grid, Group } from '@mantine/core';

import { Button, colors, Switch, Title, Text } from '../../../design-system';
import { ArrowLeft } from '../../../design-system/icons';
import { ActivePageEnum, EditorPages } from '../editor/TemplateEditorPage';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { useTemplateEditor } from './TemplateEditorProvider';
import { useStatusChangeControllerHook } from './useStatusChangeController';

const Header = ({
  activePage,
  editMode,
  name = 'Workflow Editor',
}: {
  editMode: boolean;
  activePage: ActivePageEnum;
  name?: string;
}) => {
  if (activePage === ActivePageEnum.SETTINGS) {
    return <>{editMode ? 'Edit Template' : 'Create new template'}</>;
  }
  if (activePage === ActivePageEnum.WORKFLOW) {
    return <>{name}</>;
  }

  if (activePage === ActivePageEnum.USER_PREFERENCE) {
    return <>{'User Preference Editor'}</>;
  }

  if (activePage === ActivePageEnum.SMS) {
    return <>{'Edit SMS Template'}</>;
  }

  if (activePage === ActivePageEnum.EMAIL) {
    return <>{'Edit Email Template'}</>;
  }

  if (activePage === ActivePageEnum.PUSH) {
    return <>{'Edit Push Template'}</>;
  }

  if (activePage === ActivePageEnum.CHAT) {
    return <>{'Edit Chat Template'}</>;
  }

  if (activePage === ActivePageEnum.IN_APP) {
    return <>{'Edit Notification Template'}</>;
  }

  return <>{editMode ? 'Edit Template' : 'Create new template'}</>;
};

interface Props {
  templateId: string;
  loading: boolean;
  disableSubmit: boolean;
  setActivePage: (activePage: ActivePageEnum) => void;
  activePage: ActivePageEnum;
  onTestWorkflowClicked: () => void;
}

export const TemplatePageHeader = ({
  templateId,
  loading,
  disableSubmit,
  activePage,
  setActivePage,
  onTestWorkflowClicked,
}: Props) => {
  const { template, editMode } = useTemplateEditor();
  const { readonly } = useEnvController();

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

  return (
    <Container fluid sx={{ padding: '20px', width: '100%' }}>
      <Group position="apart">
        <div>
          <Title>
            <Header editMode={editMode} activePage={activePage} name={template?.name} />
          </Title>
          <When truthy={EditorPages.includes(activePage)}>
            <Center
              mt={10}
              data-test-id="go-back-button"
              onClick={() => {
                setActivePage(
                  activePage === ActivePageEnum.WORKFLOW ? ActivePageEnum.SETTINGS : ActivePageEnum.WORKFLOW
                );
              }}
              inline
              style={{ cursor: 'pointer' }}
            >
              <ArrowLeft color={colors.B60} />
              <Text ml={5} color={colors.B60}>
                Go Back
              </Text>
            </Center>
          </When>
        </div>
        <div>
          <Grid align="center" gutter={50}>
            <When truthy={!EditorPages.includes(activePage)}>
              {editMode && (
                <Grid.Col span={4}>
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

              <Grid.Col span={editMode ? 4 : 6}>
                <Button variant="outline" data-test-id="test-workflow-btn" onClick={onTestWorkflowClicked}>
                  Test Workflow
                </Button>
              </Grid.Col>
            </When>

            <Grid.Col span={editMode ? 4 : 6}>
              <Button
                mr={20}
                data-test-id="notification-template-submit-btn"
                loading={loading}
                disabled={disableSubmit}
                submit
              >
                {editMode ? 'Update' : 'Create'}
              </Button>
            </Grid.Col>
          </Grid>
        </div>
      </Group>
    </Container>
  );
};
