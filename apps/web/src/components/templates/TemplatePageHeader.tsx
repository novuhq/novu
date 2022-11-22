import { Center, Container, Grid, Group } from '@mantine/core';
import { Button, colors, Switch, Title, Text } from '../../design-system';
import { ArrowLeft } from '../../design-system/icons';
import { ActivePageEnum } from '../../pages/templates/editor/TemplateEditorPage';
import { useEnvController } from '../../store/use-env-controller';
import { When } from '../utils/When';
import { useStatusChangeControllerHook } from './use-status-change-controller.hook';
import { useTemplateController } from './use-template-controller.hook';

const Header = ({ activePage, editMode }: { editMode: boolean; activePage: ActivePageEnum }) => {
  if (activePage === ActivePageEnum.SETTINGS) {
    return <>{editMode ? 'Edit Template' : 'Create new template'}</>;
  }
  if (activePage === ActivePageEnum.WORKFLOW) {
    return <>{'Workflow Editor'}</>;
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
  const { editMode, template } = useTemplateController(templateId);
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
            <Header editMode={editMode} activePage={activePage} />
          </Title>
          <When
            truthy={
              activePage !== ActivePageEnum.SETTINGS &&
              activePage !== ActivePageEnum.USER_PREFERENCE &&
              activePage !== ActivePageEnum.WORKFLOW &&
              activePage !== ActivePageEnum.TRIGGER_SNIPPET
            }
          >
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
            <When
              truthy={[
                ActivePageEnum.SETTINGS,
                ActivePageEnum.USER_PREFERENCE,
                ActivePageEnum.WORKFLOW,
                ActivePageEnum.TRIGGER_SNIPPET,
              ].includes(activePage)}
            >
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
              <Button mr={20} data-test-id="submit-btn" loading={loading} disabled={disableSubmit} submit>
                {editMode ? 'Update' : 'Create'}
              </Button>
            </Grid.Col>
          </Grid>
        </div>
      </Group>
    </Container>
  );
};
