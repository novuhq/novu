import { Controller, useFormContext } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { Grid } from '@mantine/core';
import { getNotificationGroups } from '../../api/notifications';
import { api } from '../../api/api.client';
import { Input, Select } from '../../design-system';
import { useEnvController } from '../../store/use-env-controller';

export const NotificationSettingsForm = ({ editMode }: { editMode: boolean }) => {
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
    }, 0);
  }

  async function addGroupItem(newGroup) {
    if (newGroup) {
      const response = await createNotificationGroup({
        name: newGroup,
      });

      setTimeout(() => {
        setValue('notificationGroup', response._id);
      }, 0);
    }
  }

  return (
    <Grid gutter={30} grow>
      <Grid.Col md={6} sm={12}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              {...field}
              data-test-id="title"
              disabled={readonly}
              value={field.value || ''}
              error={errors.name}
              label="Notification Name"
              description="This will be used to identify the notification in the app."
              placeholder="Notification name goes here..."
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input
              mt={35}
              {...field}
              value={field.value || ''}
              disabled={readonly}
              data-test-id="description"
              description="Write an internal description of when and how this notification will be used."
              label="Notification Description"
              placeholder="Describe your notification..."
            />
          )}
        />
      </Grid.Col>
      <Grid.Col md={6} sm={12}>
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
                  description="Categorize notifications into groups for unified settings control"
                  error={errors.notificationGroup}
                  getCreateLabel={(newGroup) => <div data-test-id="submit-category-btn">+ Create Group {newGroup}</div>}
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
  );
};
