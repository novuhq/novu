import { useInputState } from '@mantine/hooks';
import { ActionIcon, Container, Stack, Divider } from '@mantine/core';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { showNotification } from '@mantine/notifications';
import { IFeedEntity } from '@novu/shared';
import { IForm } from '../use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Checkbox, colors, Input } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { createFeed, getFeeds } from '../../../api/feeds';
import { QueryKeys } from '../../../api/query.keys';
import { PlusGradient } from '../../../design-system/icons';
import { FeedItems } from './FeedItems';
import { VariableManager } from '../VariableManager';
import { EnableAvatarSwitch } from './EnableAvatarSwitch';
import { useVariablesManager } from '../../../hooks/use-variables-manager';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
  const [newFeed, setNewFeed] = useInputState('');
  const [variableContents, setVariableContents] = useState<string[]>([]);
  const { setValue, getValues, watch } = useFormContext();
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
  const variablesArray = useVariablesManager(index, variableContents);

  useEffect(() => {
    const subscription = watch((values) => {
      const baseContent = ['content'];
      const template = values.steps[index].template;

      if (template.cta?.data?.url) {
        baseContent.push('cta.data.url');
      }

      template.cta?.action?.buttons?.forEach((_button, ind) => {
        baseContent.push(`cta.action.buttons.${ind}.content`);
      });

      if (JSON.stringify(baseContent) !== JSON.stringify(variableContents)) setVariableContents(baseContent);
    });

    return () => subscription.unsubscribe();
  }, [watch]);

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
      const exists = feeds.filter((feed) => feed.name === newFeed);
      if (exists.length) {
        showNotification({
          message: 'You already have a feed with this name! ',
          color: 'red',
        });

        return;
      }
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
      <Container sx={{ maxWidth: '450px', margin: '0 auto 15px auto' }}>
        <Stack spacing={25}>
          <Controller
            name={`steps.${index}.template.cta.data.url` as any}
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                error={fieldState.error?.message}
                value={field.value || ''}
                disabled={readonly}
                description="The URL that will be opened when the user clicks the CTA button."
                data-test-id="inAppRedirect"
                label="Redirect URL"
                placeholder="i.e /tasks/{{taskId}}"
              />
            )}
          />

          <InAppEditorBlock
            control={control}
            index={index}
            readonly={readonly}
            contentPlaceholder="Write your notification content here..."
          />
          <EnableAvatarSwitch name={`steps.${index}.template.enableAvatar`} control={control} />
          <Divider sx={{ borderTopColor: colors.B40 }} />
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
                      labelPosition="left"
                    />
                    <Input
                      data-test-id={`create-feed-input`}
                      disabled={!showFeed || readonly}
                      label="Add New Feed (optional)"
                      placeholder="Name your feed..."
                      value={newFeed}
                      onChange={setNewFeed}
                      description={
                        // eslint-disable-next-line max-len
                        'Feeds can be used to display specific notifications in multiple tabs or sections when fetching in-app notifications'
                      }
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
        </Stack>
      </Container>
      <Container>
        <VariableManager index={index} variablesArray={variablesArray} />
      </Container>
    </>
  );
}
