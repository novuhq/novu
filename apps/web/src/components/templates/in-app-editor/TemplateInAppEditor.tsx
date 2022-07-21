import { useInputState } from '@mantine/hooks';
import { ActionIcon, Container, Group } from '@mantine/core';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { IForm } from '../use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Checkbox, Input } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createFeed, getFeeds } from '../../../api/feeds';
import { useEffect, useState } from 'react';
import { QueryKeys } from '../../../api/query.keys';
import { PlusGradient } from '../../../design-system/icons';
import { FeedItems } from './FeedItems';
import { IFeedEntity } from '@novu/shared';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const [newFeed, setNewFeed] = useInputState('');
  const {
    formState: { errors },
    setValue,
    getValues,
  } = useFormContext();
  const { data: feeds } = useQuery(QueryKeys.getFeeds, getFeeds);
  const { mutateAsync: createNewFeed } = useMutation<
    IFeedEntity,
    { error: string; message: string; statusCode: number },
    { name: string }
  >(createFeed, {
    onSuccess: (data) => {
      queryClient.setQueryData(QueryKeys.getFeeds, [...feeds, data]);
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
        setValue(`steps.${index}.template.feedId`, response._id, { shouldDirty: true });
      }, 0);
      setShowFeed(true);
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
                      disabled={readonly}
                      onChange={() => {
                        setShowFeed(!showFeed);
                        if (showFeed) {
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
                      disabled={!showFeed || readonly}
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
                  <FeedItems field={field} index={index} showFeed={showFeed} setValue={setValue} />
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
