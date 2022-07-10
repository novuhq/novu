import { Control, Controller, useFormContext } from 'react-hook-form';
import { ActionIcon, Container, Group, SegmentedControl, useMantineTheme } from '@mantine/core';
import { IForm } from '../use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Button, colors, Input, Select, Text } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createFeed, deleteFeed, getFeeds } from '../../../api/feeds';
import { useEffect } from 'react';
import { QueryKeys } from '../../../api/query.keys';
import { Trash, PlusCircleOutlined, PlusGradient } from '../../../design-system/icons';
import { useInputState } from '@mantine/hooks';
import * as Sentry from '@sentry/react';
import { showNotification } from '@mantine/notifications';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const theme = useMantineTheme();
  const [newFeed, setNewFeed] = useInputState('');
  const {
    formState: { errors },
    setValue,
    getValues,
  } = useFormContext();
  const { data: feeds, isLoading: loadingFeeds } = useQuery(QueryKeys.getFeeds, getFeeds);
  const { mutateAsync: createNewFeed, isLoading: loadingCreateFeed } = useMutation<
    { name: string; _id: string },
    { error: string; message: string; statusCode: number },
    { name: string }
  >(createFeed, {
    onSuccess: (data) => {
      queryClient.setQueryData(QueryKeys.getFeeds, [...feeds, data]);
    },
  });
  const { mutateAsync: deleteFeedById } = useMutation<
    { name: string; _id: string }[],
    { error: string; message: string; statusCode: number },
    string
  >((feedId) => deleteFeed(feedId), {
    onSuccess: (data) => {
      queryClient.refetchQueries([QueryKeys.getFeeds]);
    },
  });

  useEffect(() => {
    const feed = getValues(`steps.${index}.template.feedId`);
    if (feeds?.length && !feed) {
      selectDefaultFeed();
    }
  }, [feeds]);

  function selectDefaultFeed() {
    setTimeout(() => {
      setValue(`steps.${index}.template.feedId`, feeds[0]._id);
    }, 0);
  }

  async function addNewFeed() {
    if (newFeed) {
      const response = await createNewFeed({
        name: newFeed,
      });

      setNewFeed('');

      setTimeout(() => {
        setValue(`steps.${index}.template.feedId`, response._id);
      }, 0);
    }
  }

  async function deleteFeedHandler(feedId: string) {
    try {
      await deleteFeedById(feedId);
      selectDefaultFeed();
      showNotification({
        message: 'Feed deleted successfully',
        color: 'green',
      });
    } catch (e: any) {
      Sentry.captureException(e);

      showNotification({
        message: e.message || 'Un-expected error occurred',
        color: 'red',
      });
    }
  }

  return (
    <>
      <Container sx={{ maxWidth: '450px', paddingLeft: '0px', margin: '0 auto 15px auto' }}>
        <Group grow direction="column">
          <Controller
            name={`steps.${index}.template.cta.data.url` as any}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ''}
                disabled={readonly}
                description="The URL that will be opened when the user clicks the CTA button."
                data-test-id="inAppRedirect"
                label="Redirect URL"
                placeholder="i.e /tasks/{{taskId}}"
              />
            )}
          />
          <Controller
            name={`steps.${index}.template.feedId` as any}
            control={control}
            render={({ field }) => {
              return (
                <>
                  {feeds?.length ? (
                    <SegmentedControl
                      {...field}
                      disabled={readonly}
                      data={(feeds || []).map((item) => ({
                        label: (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text>{item.name}</Text>
                            <ActionIcon variant="transparent" onClick={() => deleteFeedHandler(item._id)}>
                              <Trash
                                style={{
                                  color: theme.colorScheme === 'dark' ? colors.B40 : colors.B80,
                                }}
                              />
                            </ActionIcon>
                          </div>
                        ),
                        value: item._id,
                      }))}
                    />
                  ) : null}
                  <Input
                    placeholder="Add a new feed"
                    value={newFeed}
                    onChange={setNewFeed}
                    rightSection={
                      <ActionIcon variant="transparent" onClick={addNewFeed}>
                        <PlusGradient />
                      </ActionIcon>
                    }
                  />
                </>
              );
            }}
          />

          <Controller
            name={`steps.${index}.template.content` as any}
            data-test-id="in-app-content-form-item"
            control={control}
            render={({ field }) => {
              const { ref, ...fieldRefs } = field;

              return (
                <InAppEditorBlock
                  {...fieldRefs}
                  readonly={readonly}
                  contentPlaceholder="Write your notification content here..."
                />
              );
            }}
          />
        </Group>
      </Container>
    </>
  );
}
