import { ActionIcon, Grid, Stack } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useFormContext } from 'react-hook-form';
import type { IResponseError, INotificationTrigger } from '@novu/shared';

import { api } from '../../../../api/api.client';
import { Input, Select, Switch, Tooltip, Check, Copy, When } from '@novu/design-system';
import { useEnvController, useNotificationGroup } from '../../../../hooks';
import type { IForm } from '../formTypes';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';
import { useParams } from 'react-router-dom';
import { useStatusChangeControllerHook } from '../useStatusChangeController';

export const NotificationSettingsForm = ({ trigger }: { trigger?: INotificationTrigger }) => {
  const idClipboard = useClipboard({ timeout: 1000 });
  const queryClient = useQueryClient();
  const {
    formState: { errors },
    setValue,
    control,
  } = useFormContext<IForm>();

  const { template } = useTemplateEditorForm();
  const { readonly, chimera } = useEnvController({}, template?.chimera);
  const { templateId = '' } = useParams<{ templateId: string }>();

  const { isTemplateActive, changeActiveStatus, isStatusChangeLoading } = useStatusChangeControllerHook(
    templateId,
    template
  );

  const { groups, loading: loadingGroups } = useNotificationGroup();
  const { isLoading: loadingCreateGroup, mutateAsync: createNotificationGroup } = useMutation<
    { name: string; _id: string },
    IResponseError,
    {
      name: string;
    }
  >((data) => api.post('/v1/notification-groups', data), {
    onSuccess: (data) => {
      queryClient.setQueryData(['notificationGroups'], [...groups, data]);
    },
  });

  function addGroupItem(newGroup: string): undefined {
    if (newGroup) {
      createNotificationGroup({
        name: newGroup,
      }).then((response) => {
        setTimeout(() => {
          setValue('notificationGroupId', response._id);
        }, 0);

        return;
      });
    }

    return;
  }

  return (
    <>
      <When truthy={!chimera}>
        <Grid gutter={0} mt={-8} mb={-8}>
          <Grid.Col span={6}>
            <Stack
              justify="center"
              sx={{
                height: '100%',
              }}
            >
              <Switch
                label={isTemplateActive ? 'Active' : 'Inactive'}
                loading={isStatusChangeLoading}
                disabled={readonly}
                data-test-id="active-toggle-switch"
                onChange={(e) => changeActiveStatus(e.target.checked)}
                checked={isTemplateActive || false}
              />
            </Stack>
          </Grid.Col>
          <Grid.Col span={6}>
            <Controller
              name="notificationGroupId"
              defaultValue=""
              control={control}
              render={({ field }) => {
                return (
                  <>
                    <Select
                      {...field}
                      data-test-id="groupSelector"
                      loading={loadingGroups || loadingCreateGroup}
                      disabled={readonly}
                      creatable
                      searchable
                      error={errors.notificationGroupId?.message}
                      getCreateLabel={(newGroup) => (
                        <div data-test-id="submit-category-btn">+ Create group {newGroup}</div>
                      )}
                      onCreate={addGroupItem}
                      placeholder="Attach workflow to group"
                      data={(groups || []).map((item) => ({ label: item.name, value: item._id }))}
                    />
                  </>
                );
              }}
            />
          </Grid.Col>
        </Grid>
      </When>

      <Controller
        control={control}
        name="name"
        defaultValue="Untitled"
        render={({ field }) => (
          <Input
            {...field}
            data-test-id="title"
            disabled={readonly}
            value={field.value || ''}
            error={errors.name?.message}
            label="Name"
            placeholder="Workflow name goes here..."
          />
        )}
      />
      {trigger && (
        <Controller
          name="identifier"
          defaultValue=""
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              data-test-id="trigger-id"
              value={field.value || ''}
              error={fieldState.error?.message}
              label="Trigger identifier"
              description={'Used to identify your workflow when triggering it via the API'}
              disabled={readonly}
              rightSection={
                <Tooltip data-test-id={'Tooltip'} label={idClipboard.copied ? 'Copied!' : 'Copy Key'}>
                  <ActionIcon variant="transparent" onClick={() => idClipboard.copy(field.value)}>
                    {idClipboard.copied ? <Check /> : <Copy />}
                  </ActionIcon>
                </Tooltip>
              }
            />
          )}
        />
      )}
      <Controller
        name="description"
        defaultValue=""
        control={control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            error={fieldState.error?.message}
            value={field.value || ''}
            disabled={readonly}
            data-test-id="description"
            label="Description"
            placeholder="Describe your workflow..."
          />
        )}
      />

      <Controller
        name="tags"
        control={control}
        render={({ field }) => {
          return (
            <>
              <Select
                {...field}
                data-test-id="tagsSelector"
                disabled={readonly}
                creatable
                label={'Tags'}
                description={
                  'Use tags to organize your workflows, e.g. to filter them when displaying user preferences in the notification center'
                }
                searchable
                type={'multiselect'}
                error={errors.tags?.message}
                getCreateLabel={(tag) => <div data-test-id="submit-tags-btn">+ Create Tag {tag}</div>}
                placeholder="Attach a tag to identify workflow"
                data={(field.value || [])?.map((item) => ({ label: item, value: item })) || []}
              />
            </>
          );
        }}
      />
    </>
  );
};
