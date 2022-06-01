import { Grid } from '@mantine/core';
import { Button, Switch } from '../../design-system';
import { useEnvController } from '../../store/use-env-controller';
import PageHeader from '../layout/components/PageHeader';
import { useStatusChangeControllerHook } from './use-status-change-controller.hook';
import { useTemplateController } from './use-template-controller.hook';

export const TemplatePageHeader = ({ templateId, loading, disableSubmit }) => {
  const { editMode, template } = useTemplateController(templateId);
  const { readonly } = useEnvController();

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

  return (
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
  );
};
