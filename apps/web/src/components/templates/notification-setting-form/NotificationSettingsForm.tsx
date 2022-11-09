import { useEffect } from 'react';
import { ActionIcon, Grid } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { Controller, useFormContext } from 'react-hook-form';
import { INotificationTrigger } from '@novu/shared';

import { getNotificationGroups } from '../../../api/notifications';
import { api } from '../../../api/api.client';
import { Input, Select, Tooltip } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import { useEnvController } from '../../../store/use-env-controller';

export const NotificationSettingsForm = ({
  editMode,
  trigger,
}: {
  editMode: boolean;
  trigger?: INotificationTrigger;
}) => {
  const idClipboard = useClipboard({ timeout: 1000 });
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const {
    formState: { errors },
    setValue,
    control,
    getValues,
  } = useFormContext();

  const { data: groups, isLoading: loadingGroups } = useQuery('notificationGroups', getNotificationGroups);
  const { isLoading: loadingCreateGroup, mutateAsync: createNotificationGroup } = useMutation<
    { name: string; _id: string },
    { error: string; message: string; statusCode: number },
    {
      name: string;
    }
  >((data) => api.post(`/v1/notification-groups`, data), {
    onSuccess: (data) => {
      queryClient.setQueryData('notificationGroups', [...groups, data]);
    },
  });

  useEffect(() => {
    const group = getValues('notificationGroup');
    if (groups?.length && !editMode && !group) {
      selectFirstGroupByDefault();
    }
  }, [groups, editMode]);

  function selectFirstGroupByDefault() {
    setTimeout(() => {
      setValue('notificationGroup', groups[0]._id);
    }, 500);
  }

  function addGroupItem(newGroup: string): undefined {
    if (newGroup) {
      createNotificationGroup({
        name: newGroup,
      }).then((response) => {
        setTimeout(() => {
          setValue('notificationGroup', response._id);
        }, 0);

        return;
      });
    }

    return;
  }

  return (
    <>
      <Grid gutter={30} grow>
        <Grid.Col md={6} sm={12}>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                {...field}
                mb={30}
                data-test-id="title"
                disabled={readonly}
                required={!editMode}
                value={field.value || ''}
                error={errors.name?.message}
                label="Notification Name"
                description="This will be used to identify the notification in the dashboard."
                placeholder="Notification name goes here..."
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                error={fieldState.error?.message}
                value={field.value || ''}
                disabled={readonly}
                mb={30}
                data-test-id="description"
                description="Write an internal description of when and how this notification will be used."
                label="Notification Description"
                placeholder="Describe your notification..."
              />
            )}
          />
        </Grid.Col>
        <Grid.Col md={6} sm={12}>
          {trigger && (
            <Controller
              name="identifier"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  mb={30}
                  data-test-id="trigger-id"
                  value={field.value || ''}
                  error={fieldState.error?.message}
                  label="Notification Identifier"
                  description="This will be used to identify the notification template using the API."
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
            name="notificationGroup"
            control={control}
            render={({ field }) => {
              return (
                <>
                  <Select
                    {...field}
                    label="Notification Group"
                    data-test-id="groupSelector"
                    loading={loadingGroups || loadingCreateGroup}
                    disabled={readonly}
                    creatable
                    searchable
                    required={!editMode}
                    description="Categorize notifications into groups for unified settings control"
                    error={errors.notificationGroup?.message}
                    getCreateLabel={(newGroup) => (
                      <div data-test-id="submit-category-btn">+ Create Group {newGroup}</div>
                    )}
                    onCreate={addGroupItem}
                    placeholder="Attach notification to group"
                    data={(groups || []).map((item) => ({ label: item.name, value: item._id }))}
                  />
                </>
              );
            }}
          />
        </Grid.Col>
      </Grid>
    </>
  );
};
