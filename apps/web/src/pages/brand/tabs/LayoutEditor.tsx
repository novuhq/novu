import { useForm, Controller } from 'react-hook-form';
import { EmailCustomCodeEditor } from '../../../components/templates/email-editor/EmailCustomCodeEditor';
import { Center, Grid } from '@mantine/core';
import { ArrowLeft } from '../../../design-system/icons';
import { Button, Checkbox, colors, Input, Text, LoadingOverlay } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createLayout, getLayoutById } from '../../../api/layouts';
import { useEffect, useState } from 'react';

export function LayoutEditor({
  id = '',
  editMode = false,
  goBack,
}: {
  id?: string;
  editMode?: boolean;
  goBack: () => void;
}) {
  const { readonly } = useEnvController();

  const { data: layout, isLoading: isLoadingLayout } = useQuery(['getLayout', id], () => getLayoutById(id), {
    enabled: !!id,
  });

  const { handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      content: layout?.content || '',
      name: layout?.name || '',
      description: '',
      isDefault: layout?.isDefault || false,
    },
  });
  const { mutateAsync: createNewLayout, isLoading: isLoadingCreate } = useMutation(createLayout);

  useEffect(() => {
    if (layout) {
      if (layout.content) {
        setValue('content', layout?.content);
      }
      if (layout.name) {
        setValue('name', layout?.name);
      }
      if (layout.isDefault != null) {
        setValue('isDefault', layout?.isDefault);
      }
    }
  }, [layout]);

  useEffect(() => {
    try {
      const ast = parse(content);
      const vars = getTemplateVariables(ast.body);
    } catch (e) {
      return;
    }
  }, [content]);

  async function onUpdateLayout(data) {
    const updatePayload = {
      name: data.name,
      content: data.content,
      isDefault: data.isDefault,
    };

    try {
      await createNewLayout(data);
      successMessage(`Layout ${editMode ? 'Updated' : 'Created'}!`);
      goBack();
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');
    }
  }

  const isLoading = (editMode && isLoadingLayout) || isLoadingCreate;

  return (
    <LoadingOverlay visible={isLoading}>
      <Center mb={10} data-test-id="go-back-button" onClick={() => goBack()} inline style={{ cursor: 'pointer' }}>
        <ArrowLeft color={colors.B60} />
        <Text ml={5} color={colors.B60}>
          Go Back
        </Text>
      </Center>
      <form name={'layout-form'} onSubmit={handleSubmit(onUpdateLayout)}>
        <Grid gutter={30} grow>
          <Grid.Col md={5} sm={12}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  mb={30}
                  data-test-id="layout-name"
                  disabled={readonly}
                  required
                  value={field.value || ''}
                  label="Layout Name"
                  placeholder="Layout name goes here..."
                />
              )}
            />
          </Grid.Col>
          <Grid.Col md={5} sm={12}>
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  value={field.value || ''}
                  disabled={readonly}
                  mb={30}
                  data-test-id="layout-description"
                  label="Layout Description"
                  placeholder="Describe your layout..."
                />
              )}
            />
          </Grid.Col>
          <Grid.Col md={2} sm={12}>
            <Center>
              <Controller
                name="isDefault"
                control={control}
                render={({ field, fieldState }) => {
                  return (
                    <Checkbox
                      checked={field.value === true}
                      disabled={readonly}
                      onChange={field.onChange}
                      mt={30}
                      data-test-id="is-default-layout"
                      label="Set as Default"
                    />
                  );
                }}
              />
            </Center>
          </Grid.Col>
        </Grid>

        <Controller
          name="content"
          data-test-id="layout-content"
          control={control}
          render={({ field }) => {
            return <EmailCustomCodeEditor onChange={field.onChange} value={field.value} />;
          }}
        />
        <Button submit mb={20} mt={25} data-test-id="submit-layout">
          {editMode ? 'Update' : 'Create'}
        </Button>
      </form>
    </LoadingOverlay>
  );
}
