import { useForm, Controller } from 'react-hook-form';
import { EmailCustomCodeEditor } from '../../../components/templates/email-editor/EmailCustomCodeEditor';
import { Center, Grid, UnstyledButton, useMantineTheme } from '@mantine/core';
import { ArrowLeft } from '../../../design-system/icons';
import { Button, Checkbox, colors, Input, Text, LoadingOverlay, Tooltip } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLayout, getLayoutById, updateLayoutById } from '../../../api/layouts';
import { useEffect, useState } from 'react';
import { parse } from '@handlebars/parser';
import { getTemplateVariables, IMustacheVariable, SystemVariablesWithTypes } from '@novu/shared';
import { EditGradient } from '../../../design-system/icons/gradient/EditGradient';
import { VarLabel } from '../../../components/templates/email-editor/variables-management/VarLabel';
import { VarItemsDropdown } from '../../../components/templates/email-editor/variables-management/VarItemsDropdown';
import { VarItemTooltip } from '../../../components/templates/email-editor/variables-management/VarItemTooltip';
import { useProcessVariables } from '../../../hooks/use-process-variables';

import { ILayoutEntity } from '@novu/shared';
import { QueryKeys } from '../../../api/query.keys';

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
  const theme = useMantineTheme();
  const [variables, setVariables] = useState<IMustacheVariable[]>([]);
  const processedVariables = useProcessVariables(variables, false);
  const queryClient = useQueryClient();

  const { data: layout, isLoading: isLoadingLayout } = useQuery<ILayoutEntity>(
    [QueryKeys.getLayoutById, id],
    () => getLayoutById(id),
    {
      enabled: !!id,
    }
  );

  const { handleSubmit, watch, control, setValue } = useForm({
    defaultValues: {
      content: layout?.content || '',
      name: layout?.name || '',
      description: layout?.description || '',
      isDefault: layout?.isDefault || false,
    },
  });
  const layoutContent = watch('content');
  const { mutateAsync: createNewLayout, isLoading: isLoadingCreate } = useMutation(createLayout);
  const { mutateAsync: updateLayout, isLoading: isLoadingUpdate } = useMutation<
    ILayoutEntity,
    { error: string; message: string; statusCode: number },
    { layoutId: string; data: any }
  >(({ layoutId, data }) => updateLayoutById(layoutId, data));

  useEffect(() => {
    if (layout) {
      if (layout.content) {
        setValue('content', layout?.content);
      }
      if (layout.name) {
        setValue('name', layout?.name);
      }
      if (layout.description) {
        setValue('description', layout?.description);
      }
      if (layout.isDefault != null) {
        setValue('isDefault', layout?.isDefault);
      }
    }
  }, [layout]);

  useEffect(() => {
    try {
      const ast = parse(layoutContent);
      const vars = getTemplateVariables(ast.body);
      setVariables(vars);
    } catch (e) {
      return;
    }
  }, [layoutContent]);

  async function onUpdateLayout(data) {
    const updatePayload = {
      name: data.name,
      content: data.content,
      description: data.description,
      isDefault: data.isDefault,
    };

    try {
      if (editMode) {
        await updateLayout({ layoutId: id, data: updatePayload });
      } else {
        await createNewLayout(data);
      }
      await queryClient.refetchQueries([QueryKeys.getLayoutsList]);

      successMessage(`Layout ${editMode ? 'Updated' : 'Created'}!`);
      goBack();
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');
    }
  }

  const isLoading = (editMode && isLoadingLayout) || isLoadingCreate || isLoadingUpdate;

  return (
    <LoadingOverlay visible={isLoading}>
      <Center mb={10} data-test-id="go-back-button" onClick={() => goBack()} inline style={{ cursor: 'pointer' }}>
        <ArrowLeft color={colors.B60} />
        <Text ml={5} color={colors.B60}>
          Go Back
        </Text>
      </Center>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
          borderRadius: 7,
          padding: 15,
        }}
      >
        <div
          style={{
            textAlign: 'right',
            marginBottom: '20px',
          }}
        >
          <Tooltip label="Add defaults or mark as required">
            <UnstyledButton onClick={() => {}} type="button">
              <Text gradient>
                Edit Variables
                <EditGradient
                  style={{
                    width: '18px',
                    height: '18px',
                    marginBottom: '-4px',
                    marginLeft: 5,
                  }}
                />
              </Text>
            </UnstyledButton>
          </Tooltip>
        </div>
        <VarLabel label="System Variables">
          {Object.keys(SystemVariablesWithTypes).map((name, ind) => {
            const type = SystemVariablesWithTypes[name];

            if (typeof type === 'object') {
              return <VarItemsDropdown name={name} key={ind} type={type} />;
            }

            return <VarItemTooltip pathToCopy={name} name={name} type={type} key={ind} />;
          })}
        </VarLabel>
        <div
          style={{
            marginTop: '20px',
          }}
        >
          <VarLabel label="Step Variables">
            {Object.keys(processedVariables).map((name, ind) => {
              if (typeof processedVariables[name] === 'object') {
                return <VarItemsDropdown key={ind} name={name} type={processedVariables[name]} />;
              }

              return <VarItemTooltip pathToCopy={name} name={name} type={typeof processedVariables[name]} key={ind} />;
            })}
          </VarLabel>
        </div>
      </div>
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
              render={({ field }) => (
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
                render={({ field }) => {
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
