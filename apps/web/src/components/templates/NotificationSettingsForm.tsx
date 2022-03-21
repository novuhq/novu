import { Controller, useFormContext } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useEffect, useState } from 'react';
import { Grid } from '@mantine/core';
import { getNotificationGroups } from '../../api/notifications';
import { api } from '../../api/api.client';
import { Input, Select } from '../../design-system';

export const NotificationSettingsForm = ({ editMode }: { editMode: boolean; errors: any }) => {
  const queryClient = useQueryClient();
  const {
    formState: { errors },
    setValue,
    control,
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

  async function addGroupItem(newGroup) {
    if (newGroup) {
      const response = await createNotificationGroup({
        name: newGroup,
      });

      setValue('notificationGroup', response._id);
    }
  }

  return (
    <Grid gutter={30} grow>
      <Grid.Col span={6}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              {...field}
              data-test-id="title"
              value={field.value || ''}
              error={errors.name}
              label="Notification Name"
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
              data-test-id="description"
              label="Notification Description"
              placeholder="Describe your notification..."
            />
          )}
        />
      </Grid.Col>
      <Grid.Col span={6}>
        <Controller
          name="notificationGroup"
          control={control}
          render={({ field }) => (
            <>
              <Select
                {...field}
                label="Notification Group"
                data-test-id="groupSelector"
                loading={loadingGroups || loadingCreateGroup}
                creatable
                searchable
                error={errors.notificationGroup}
                getCreateLabel={(newGroup) => `+ Create Group ${newGroup}`}
                onCreate={addGroupItem}
                placeholder="Attach notification to group"
                data={(groups || []).map((item) => ({ label: item.name, value: item._id }))}
              />
            </>
          )}
        />
      </Grid.Col>
    </Grid>
  );
};
