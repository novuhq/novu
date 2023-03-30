import { useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { showNotification } from '@mantine/notifications';

import FlowEditor from './workflow/FlowEditor';
import { channels } from '../shared/channels';
import type { IForm } from '../components/formTypes';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { Outlet, useParams } from 'react-router-dom';
import { Container, TextInput, useMantineColorScheme } from '@mantine/core';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';

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

  const currentStep = useMemo(
    () => steps.find((message) => message.template.type === channel && message.uuid === toDelete),
    [channel, toDelete, steps]
  );

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
          }}
        />
      </When>
      <When truthy={!channel || ![StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel)}>
        <div style={{ minHeight: '100%', display: 'flex', flexFlow: 'row' }}>
          <div
            style={{
              minHeight: 'calc(100vh - var(--mantine-header-height, 0px) - 60px)',
              flex: '1 1 auto',
              display: 'flex',
              flexFlow: 'Column',
            }}
          >
            <Container fluid sx={{ padding: '20px', width: '100%', height: '74px' }}>
              <Controller
                control={control}
                name="name"
                defaultValue="Untitled"
                render={({ field, fieldState }) => {
                  return (
                    <TextInput
                      styles={(theme) => ({
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
            </Container>
            <FlowEditor onDelete={onDelete} dragging={dragging} errors={errors} steps={steps} addStep={addStep} />
          </div>
          <div
            style={{
              position: 'relative',
              minWidth: '260px',
              width: 'auto',
              minHeight: 'calc(100vh - var(--mantine-header-height, 0px) - 60px)',
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
        title={`Delete ${currentStep?.template.type} step?`}
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
