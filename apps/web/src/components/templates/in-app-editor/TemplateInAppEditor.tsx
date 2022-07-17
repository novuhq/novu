import { Control, Controller, useFormContext } from 'react-hook-form';
import { ActionIcon, Chip, Container, Group, Chips, useMantineTheme } from '@mantine/core';
import { IForm } from '../use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Checkbox, colors, Input } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createFeed, deleteFeed, getFeeds } from '../../../api/feeds';
import { useEffect, useState } from 'react';
import { QueryKeys } from '../../../api/query.keys';
import { Trash, PlusGradient } from '../../../design-system/icons';
import { useInputState } from '@mantine/hooks';
import * as Sentry from '@sentry/react';
import { showNotification } from '@mantine/notifications';
import { getOutlineStyles } from '../../../design-system/button/Button.styles';

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
  const { data: feeds } = useQuery(QueryKeys.getFeeds, getFeeds);
  const { mutateAsync: createNewFeed } = useMutation<
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
  const [showFeed, setShowFeed] = useState(true);

  useEffect(() => {
    const feed = getValues(`steps.${index}.template.feedId`);
    if (feeds?.length && !feed) {
      selectDefaultFeed();
      setShowFeed(false);
    }
  }, [feeds]);

  function selectDefaultFeed() {
    setTimeout(() => {
      setValue(`steps.${index}.template.feedId`, '');
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
                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <Checkbox
                      data-test-id={`use-feeds-checkbox`}
                      checked={showFeed}
                      onChange={() => {
                        setShowFeed(!showFeed);
                        if (showFeed === true) {
                          setValue(`steps.${index}.template.feedId`, '', { shouldDirty: true });
                        }
                      }}
                      sx={{
                        position: 'absolute',
                        flexDirection: 'row-reverse',
                        right: '0px',
                      }}
                      styles={{
                        label: {
                          marginRight: '10px',
                        },
                      }}
                      label="Use Feeds"
                    />
                    <Input
                      data-test-id={`create-feed-input`}
                      disabled={!showFeed}
                      label="Add New Feed (optional)"
                      placeholder="Name your feed..."
                      value={newFeed}
                      onChange={setNewFeed}
                      rightSection={
                        <ActionIcon data-test-id={`add-feed-button`} variant="transparent" onClick={addNewFeed}>
                          <PlusGradient />
                        </ActionIcon>
                      }
                    />
                  </div>
                  <Chips
                    size="xl"
                    radius="md"
                    {...field}
                    styles={{
                      label: {
                        padding: '0 15px',
                      },
                      filled: {
                        backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
                        ':hover': {
                          backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
                        },
                      },
                      iconWrapper: { display: 'none' },
                      checked: {
                        ...getOutlineStyles(theme),
                        color: theme.colorScheme === 'dark' ? theme.white : colors.B40,
                      },
                    }}
                  >
                    {(feeds || []).map((item, ind) => (
                      <Chip value={item._id} data-test-id={`feed-button-${ind}`} disabled={!showFeed}>
                        {item.name}
                        <ActionIcon
                          disabled={!showFeed}
                          sx={{
                            display: 'inline',
                            float: 'right',
                            marginTop: '7px',
                            ':disabled': {
                              display: 'none',
                            },
                          }}
                          variant="transparent"
                          onClick={() => deleteFeedHandler(item._id)}
                        >
                          <Trash
                            style={{
                              color: theme.colorScheme === 'dark' ? colors.B40 : colors.B80,
                            }}
                          />
                        </ActionIcon>
                      </Chip>
                    ))}
                  </Chips>
                </>
              );
            }}
          />

          <InAppEditorBlock
            control={control}
            index={index}
            readonly={readonly}
            contentPlaceholder="Write your notification content here..."
          />
        </Group>
      </Container>
    </>
  );
}
