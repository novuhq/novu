import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { showNotification } from '@mantine/notifications';

import FlowEditor from './workflow/FlowEditor';
import { channels } from '../shared/channels';
import type { IForm } from '../components/formTypes';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Container, TextInput, useMantineColorScheme, Group, Stack } from '@mantine/core';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { useBasePath } from '../hooks/useBasePath';
import { UpdateButton } from '../components/UpdateButton';

const WorkflowEditor = () => {
  const { addStep, deleteStep } = useTemplateEditorForm();
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const [dragging, setDragging] = useState(false);

  const {
    control,
    watch,
    formState: { errors, isSubmitted },
  } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const showErrors = isSubmitted && errors?.steps;
  const steps = watch('steps');

  const [toDelete, setToDelete] = useState<string>('');
  const basePath = useBasePath();
  const { pathname } = useLocation();

  const { colorScheme } = useMantineColorScheme();

  const confirmDelete = () => {
    const index = steps.findIndex((item) => item.uuid === toDelete);
    deleteStep(index);
    setToDelete('');
  };

  const cancelDelete = () => {
    setToDelete('');
  };

  const onDelete = (uuid) => {
    const stepToDelete = steps.find((step) => step.uuid === uuid);

    if (!stepToDelete) {
      setToDelete(uuid);

      return;
    }

    const dependingStep = steps.find((step) => {
      return (
        step.filters?.find(
          (filter) =>
            filter.children?.find(
              (item) => item.on === FilterPartTypeEnum.PREVIOUS_STEP && item.step === stepToDelete.uuid
            ) !== undefined
        ) !== undefined
      );
    });

    if (dependingStep) {
      const sameTypeSteps = steps.filter((step) => step.template.type === dependingStep.template.type);
      const foundIndex = sameTypeSteps.findIndex((step) => step.uuid === dependingStep.uuid);

      const label = channels.find((item) => item.channelType === dependingStep.template.type)?.label;

      showNotification({
        message: `${label} ${
          sameTypeSteps.length > 1 ? `(${foundIndex + 1}) ` : ''
        } filters is depending on the step you try to delete`,
        color: 'red',
      });

      return;
    }

    setToDelete(uuid);
  };

  return (
    <>
      <When truthy={channel && [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel)}>
        <Outlet
          context={{
            setDragging,
            onDelete,
          }}
        />
      </When>
      <When truthy={!channel || ![StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel)}>
        <div style={{ minHeight: '600px', display: 'flex', flexFlow: 'row' }}>
          <div
            style={{
              flex: '1 1 auto',
              display: 'flex',
              flexFlow: 'Column',
            }}
          >
            <Container fluid sx={{ width: '100%', height: '74px' }}>
              <Stack
                justify="center"
                sx={{
                  height: '100%',
                }}
              >
                <Group>
                  <Controller
                    control={control}
                    name="name"
                    defaultValue="Untitled"
                    render={({ field, fieldState }) => {
                      return (
                        <TextInput
                          styles={(theme) => ({
                            root: {
                              flex: '1 1 auto',
                            },
                            wrapper: {
                              background: 'transparent',
                              width: '100%',
                            },
                            input: {
                              background: 'transparent',
                              borderStyle: 'solid',
                              borderColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
                              borderWidth: '1px',
                              fontSize: '20px',
                              fontWeight: 'bolder',
                              padding: 9,
                              lineHeight: '28px',
                              minHeight: 'auto',
                              height: 'auto',
                              width: '100%',
                              textOverflow: 'ellipsis',
                              '&:not(:placeholder-shown)': {
                                borderStyle: 'none',
                                padding: 10,
                              },
                              '&:hover, &:focus': {
                                borderStyle: 'solid',
                                padding: 9,
                              },
                            },
                          })}
                          {...field}
                          value={field.value || ''}
                          error={showErrors && fieldState.error?.message}
                          type="text"
                          data-test-id="title"
                          placeholder="Enter notification name"
                          disabled={readonly}
                        />
                      );
                    }}
                  />
                  <When truthy={pathname !== basePath}>
                    <UpdateButton />
                  </When>
                </Group>
              </Stack>
            </Container>
            <FlowEditor onDelete={onDelete} dragging={dragging} errors={errors} steps={steps} addStep={addStep} />
          </div>
          <div
            style={{
              position: 'relative',
              minWidth: '260px',
              width: 'auto',
              minHeight: '600px',
            }}
          >
            <Outlet
              context={{
                setDragging,
                onDelete,
              }}
            />
          </div>
        </div>
      </When>
      <DeleteConfirmModal
        description={
          'This cannot be undone. ' +
          'The trigger code will be updated and this step will no longer participate in the notification workflow.'
        }
        target="step"
        title={`Delete step?`}
        isOpen={toDelete.length > 0}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText="Delete step"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default WorkflowEditor;

export const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;
