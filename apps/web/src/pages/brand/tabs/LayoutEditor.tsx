import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Center, Grid, Group, Modal, Title, useMantineTheme } from '@mantine/core';
import { ArrowLeft } from '../../../design-system/icons';
import { Button, Checkbox, colors, Input, Text, LoadingOverlay, shadows } from '../../../design-system';
import { useEffectOnce, useEnvController, useLayoutsEditor, usePrompt } from '../../../hooks';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import isEqual from 'lodash.isequal';
import { parse } from '@handlebars/parser';
import { getTemplateVariables, ITemplateVariable, isReservedVariableName, LayoutId } from '@novu/shared';

import { QueryKeys } from '../../../api/query.keys';
import { VariablesManagement } from '../../templates/components/email-editor/variables-management/VariablesManagement';
import { UnsavedChangesModal } from '../../templates/components/UnsavedChangesModal';
import { VariableManager } from '../../templates/components/VariableManager';
import { EmailCustomCodeEditor } from '../../templates/components/email-editor/EmailCustomCodeEditor';
import { useVariablesManager } from './use-variables';
const strArray = ['content'];
type UnknownArrayOrObject = unknown[] | Record<string, unknown>;

interface ILayoutForm {
  content: string;
  name: string;
  description: string;
  isDefault: boolean;
  variables: ITemplateVariable[];
}
const defaultFormValues = {
  content: '',
  name: '',
  description: '',
  isDefault: false,
  variables: [],
};
export function LayoutEditor({
  id = '',
  editMode = false,
  goBack,
}: {
  id?: string;
  editMode?: boolean;
  goBack: () => void;
}) {
  const { readonly, environment } = useEnvController();
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  // const [ast, setAst] = useState<any>({ body: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [layoutId, setLayoutId] = useState<LayoutId>(id);

  const { layout, isLoading, createNewLayout, updateLayout } = useLayoutsEditor(layoutId);

  const {
    handleSubmit,
    watch,
    control,
    getValues,
    reset,
    setValue,
    formState: { isDirty, dirtyFields: formDirtyFields },
  } = useForm<ILayoutForm>({
    defaultValues: { content: '', name: '', description: '', isDefault: false, variables: [] },
    // mode: 'onChange',
  });
  const [showModal, confirmNavigation, cancelNavigation] = usePrompt(isDirty);
  console.log(layoutId, isDirty);
  // const layoutContent = watch('content');

  // const variablesArray = useVariablesManager(0, strArray);

  const variablesArray = useFieldArray({ control, name: `variables` });
  const variableArray = watch(`variables`, []);

  const getTextContent = useCallback((templateToParse?: any): string => {
    return strArray
      .map((con) => con.split('.').reduce((a, b) => a && a[b], templateToParse ?? {}))
      .map((con) => (Array.isArray(con) ? con.map((innerCon) => innerCon.content).join(' ') : con))
      .join(' ');
  }, []);

  const [textContent, setTextContent] = useState<string>(() => getTextContent(getValues(`content`)));

  useLayoutEffect(() => {
    const subscription = watch((values) => {
      const steps = values.content ?? '';

      if (!steps.length) return;
      // const step = steps[index];
      setTextContent(getTextContent(values));
    });

    return () => subscription.unsubscribe();
  }, [watch, setTextContent, getTextContent]);

  useLayoutEffect(() => {
    try {
      const ast = parse(textContent);
      const variables = getTemplateVariables(ast.body).filter(
        ({ name }) => !isReservedVariableName(name)
      ) as ITemplateVariable[];
      const arrayFields = [...(variableArray || [])];

      variables.forEach((vari) => {
        if (!arrayFields.find((field) => field.name === vari.name)) {
          arrayFields.push(vari);
        }
      });

      arrayFields.forEach((vari, ind) => {
        if (!variables.find((field) => field.name === vari.name)) {
          delete arrayFields[ind];
        }
      });

      const newVariablesArray = arrayFields.filter((field) => !!field);

      if (!isEqual(variableArray, newVariablesArray)) {
        variablesArray.replace(newVariablesArray);
      }
    } catch (e) {
      return;
    }
  }, [textContent, variableArray]);

  const dirtyValues = (
    dirtyFields: UnknownArrayOrObject | boolean,
    allValues: UnknownArrayOrObject
  ): UnknownArrayOrObject => {
    console.log('dirtyFields', dirtyFields);
    if (dirtyFields === true || Array.isArray(dirtyFields)) {
      console.log('allValues', allValues);

      return allValues;
    }

    console.log('keys', Object.keys(dirtyFields));
    console.log(Object.keys(dirtyFields).map((key) => [key, dirtyValues(dirtyFields[key], allValues[key])]));

    // Here, we have an object.
    return Object.fromEntries(
      Object.keys(dirtyFields)
        .filter((field) => dirtyFields[field] !== false)
        .map((key) => [key, dirtyValues(dirtyFields[key], allValues[key])])
    );
  };
  // const variablesArray = useFieldArray({ control, name: `variables` });

  // const variableArray = watch(`variables`, []);

  /*
   * useEffect(() => {
   *   if (layout) {
   *     if (layout.content) {
   *       setValue('content', layout?.content);
   *     }
   *     if (layout.name) {
   *       console.log('here');
   *       setValue('name', layout?.name);
   *     }
   *
   *     if (layout.description) {
   *       setValue('description', layout?.description);
   *     }
   *
   *     if (layout.variables) {
   *       setValue('variables', layout?.variables);
   *     }
   *     if (layout.isDefault != null) {
   *       setValue('isDefault', layout?.isDefault);
   *     }
   *   }
   * }, [layout]);
   */
  const mapNotificationTemplateToForm = (layoutForm) => {
    return {
      content: layoutForm.content ?? '',
      name: layoutForm.name ?? '',
      description: layoutForm.description ?? '',
      variables: layoutForm.variables ?? [],
      isDefault: layoutForm.isDefault || false,
    };
  };

  useEffectOnce(() => {
    if (!layout) return;

    const form = mapNotificationTemplateToForm(layout);
    console.log(form);
    reset(form);
  }, !!layout);

  useEffect(() => {
    if (environment && layout) {
      if (environment._id !== layout._environmentId) {
        if (layout._parentId) {
          setLayoutId(layout._parentId);
        } else {
          goBack();
        }
      }
    }
  }, [environment, layout]);

  /*
   * useMemo(() => {
   *   const variables = getTemplateVariables(ast.body).filter(
   *     ({ name }) => !isReservedVariableName(name)
   *   ) as ITemplateVariable[];
   *   const arrayFields = [...(variableArray || [])];
   *
   *   variables.forEach((vari) => {
   *     if (!arrayFields.find((field) => field.name === vari.name)) {
   *       arrayFields.push(vari);
   *     }
   *   });
   *   arrayFields.forEach((vari, ind) => {
   *     if (!variables.find((field) => field.name === vari.name)) {
   *       delete arrayFields[ind];
   *     }
   *   });
   *   const newVariablesArray = arrayFields.filter((field) => !!field);
   *
   *   if (!isEqual(variableArray, newVariablesArray)) {
   *     variablesArray.replace(newVariablesArray);
   *   }
   * }, [ast]);
   *
   * useEffect(() => {
   *   try {
   *     setAst(parse(layoutContent));
   *   } catch (e) {
   *     return;
   *   }
   * }, [layoutContent]);
   */

  async function onSubmitLayout(data) {
    console.log(data);
    console.log('formDirtyFields', formDirtyFields);
    console.log('bllls', dirtyValues(formDirtyFields, data));
    try {
      if (editMode) {
        await updateLayout({ layoutId: id, data: dirtyValues(formDirtyFields, data) });
        reset(data);
      } else {
        await createNewLayout(data);
      }

      successMessage(`Layout ${editMode ? 'Updated' : 'Created'}!`);
      goBack();
      await queryClient.refetchQueries([QueryKeys.getLayoutsList]);
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error occurred');
    }
  }

  return (
    <LoadingOverlay visible={isLoading}>
      <Center mb={15} data-test-id="go-back-button" onClick={() => goBack()} inline style={{ cursor: 'pointer' }}>
        <ArrowLeft color={colors.B60} />
        <Text ml={5} color={colors.B60}>
          Go Back
        </Text>
      </Center>
      <form name={'layout-form'} onSubmit={handleSubmit(onSubmitLayout)}>
        <Grid grow>
          <Grid.Col span={9}>
            <Grid gutter={30} grow>
              <Grid.Col md={5} sm={12}>
                <Controller
                  control={control}
                  name="name"
                  defaultValue=""
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
                  defaultValue=""
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
            </Grid>

            <Controller
              name="content"
              data-test-id="layout-content"
              defaultValue=""
              control={control}
              render={({ field }) => {
                return <EmailCustomCodeEditor onChange={field.onChange} value={field.value} />;
              }}
            />
          </Grid.Col>
          <Grid.Col
            span={3}
            style={{
              maxWidth: '350px',
            }}
          >
            <VariablesManagement
              index={0}
              openVariablesModal={() => {
                setModalOpen(true);
              }}
              path="variables"
              control={control}
            />
          </Grid.Col>
        </Grid>
        <Group position="right" py={20}>
          <Controller
            name="isDefault"
            control={control}
            defaultValue={false}
            render={({ field }) => {
              return (
                <Checkbox
                  checked={field.value === true}
                  disabled={readonly}
                  onChange={field.onChange}
                  data-test-id="is-default-layout"
                  label="Set as Default"
                />
              );
            }}
          />

          <Button disabled={readonly || isLoading || !isDirty} submit data-test-id="submit-layout">
            {editMode ? 'Update' : 'Create'}
          </Button>
        </Group>
      </form>
      <Modal
        opened={modalOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
            width: '90%',
          },
          body: {
            paddingTop: '5px',
            paddingInline: '8px',
          },
        }}
        title={<Title>Variables</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={() => {
          setModalOpen(false);
        }}
        centered
        overflow="inside"
      >
        <VariableManager index={0} variablesArray={variablesArray} path="" control={control} />
        <Group position="right">
          <Button
            data-test-id="close-var-manager-modal"
            mt={30}
            onClick={() => {
              setModalOpen(false);
            }}
          >
            Close
          </Button>
        </Group>
      </Modal>
      <UnsavedChangesModal
        isOpen={showModal}
        cancelNavigation={cancelNavigation}
        confirmNavigation={confirmNavigation}
      />
    </LoadingOverlay>
  );
}
