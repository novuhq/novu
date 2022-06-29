import { Control, Controller, useFormContext } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import { IForm } from '../use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Input, Select } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { createFeed, getFeeds } from '../../../api/feeds';
import { useEffect } from 'react';
import { QueryKeys } from '../../../api/query.keys';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const queryClient = useQueryClient();
  const { readonly } = useEnvController();
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

  async function addNewFeed(newFeed) {
    if (newFeed) {
      const response = await createNewFeed({
        name: newFeed,
      });

      setTimeout(() => {
        setValue(`steps.${index}.template.feedId`, response._id);
      }, 0);
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
                  <Select
                    {...field}
                    label="Feeds"
                    data-test-id="feedSelector"
                    loading={loadingFeeds || loadingCreateFeed}
                    disabled={readonly}
                    creatable
                    searchable
                    required
                    description="Choose a feed category"
                    error={errors?.steps ? errors.steps[index]?.template?.feedId?.message : undefined}
                    getCreateLabel={(newGroup) => (
                      <div data-test-id="submit-category-btn">+ Create Feed {newGroup}</div>
                    )}
                    onCreate={addNewFeed}
                    placeholder="Attach message to feed"
                    data={(feeds || []).map((item) => ({ label: item.name, value: item._id }))}
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
