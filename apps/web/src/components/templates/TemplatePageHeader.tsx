import { Center, Container, Grid, Group } from '@mantine/core';
import { useState } from 'react';
import { Button, colors, Switch, Title, Text } from '../../design-system';
import { ArrowLeft } from '../../design-system/icons';
import { useEnvController } from '../../store/use-env-controller';
import { When } from '../utils/When';
import { EditorPreviewSwitch } from './EditorPreviewSwitch';
import { useStatusChangeControllerHook } from './use-status-change-controller.hook';
import { useTemplateController } from './use-template-controller.hook';

const Header = ({ activePage, editMode }) => {
  if (activePage === 'Settings') {
    return <>{editMode ? 'Edit Template' : 'Create new template'}</>;
  }
  if (activePage === 'Workflow') {
    return <>{'Workflow Editor'}</>;
  }

  if (activePage === 'sms') {
    return <>{'Edit SMS Template'}</>;
  }

  if (activePage === 'email') {
    return <>{'Edit Email Template'}</>;
  }

  if (activePage === 'in_app') {
    return <>{'Edit Notification Template'}</>;
  }

  return <>{editMode ? 'Edit Template' : 'Create new template'}</>;
};

export const TemplatePageHeader = ({ templateId, loading, disableSubmit, setActivePage, activePage }) => {
  const { editMode, template } = useTemplateController(templateId);
  const [view, setView] = useState<'Edit' | 'Preview'>('Edit');
  const { readonly } = useEnvController();

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

  return (
    <Container fluid sx={{ padding: '20px' }}>
      <Group position="apart">
        <div>
          <Title>
            <Header editMode={editMode} activePage={activePage} />
          </Title>
          <When truthy={activePage !== 'Settings' && activePage !== 'TriggerSnippet'}>
            <Center
              mt={10}
              onClick={() => {
                setActivePage(activePage === 'Workflow' ? 'Settings' : 'Workflow');
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
          <EditorPreviewSwitch view={view} setView={setView} />
        </div>
        <div>
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
        </div>
      </Group>
    </Container>
  );
};
