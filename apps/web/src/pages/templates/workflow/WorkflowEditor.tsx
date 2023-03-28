import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { showNotification } from '@mantine/notifications';

import FlowEditor from './workflow/FlowEditor';
import { channels, getChannel, NodeTypeEnum } from '../shared/channels';
import type { IForm } from '../components/formTypes';
import { When } from '../../../components/utils/When';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { FilterModal } from '../filter/FilterModal';
import { useTemplateEditorContext } from '../editor/TemplateEditorProvider';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { Outlet, useParams } from 'react-router-dom';
import { Container, TextInput } from '@mantine/core';
import { useEnvController } from '../../../hooks';

const WorkflowEditor = () => {
  const { addStep, deleteStep } = useTemplateEditorForm();
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const { activeStepIndex } = useTemplateEditorContext();
  const hasActiveStepSelected = activeStepIndex >= 0;
  const [dragging, setDragging] = useState(false);

  const {
    control,
    watch,
    formState: { errors, isSubmitted },
  } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const showErrors = isSubmitted && errors?.steps;

  const [filterOpen, setFilterOpen] = useState(false);
  const steps = watch('steps');

  const [toDelete, setToDelete] = useState<string>('');

  const confirmDelete = () => {
    const index = steps.findIndex((item) => item.uuid === toDelete);
    deleteStep(index);
    setToDelete('');
  };

  const cancelDelete = () => {
    setToDelete('');
  };

  const onDelete = (uuid) => {
    const currentStep = steps.find((step) => step.uuid === uuid);

    if (!currentStep) {
      setToDelete(uuid);

      return;
    }

    const dependingStep = steps.find((step) => {
      return (
        step.filters?.find(
          (filter) =>
            filter.children?.find(
              (item) => item.on === FilterPartTypeEnum.PREVIOUS_STEP && item.step === currentStep.uuid
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

  if (channel && [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel)) {
    return (
      <>
        <Outlet
          context={{
            setDragging,
          }}
        />
        <DeleteConfirmModal
          target={channel !== null && getChannel(channel ?? '')?.type === NodeTypeEnum.CHANNEL ? 'step' : 'action'}
          isOpen={toDelete.length > 0}
          confirm={confirmDelete}
          cancel={cancelDelete}
        />
      </>
    );
  }

  return (
    <>
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
                    styles={() => ({
                      wrapper: {
                        background: 'transparent',
                        width: '100%',
                      },
                      input: {
                        background: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        fontWeight: 'bolder',
                        padding: 0,
                        lineHeight: '28px',
                        minHeight: 'auto',
                        height: 'auto',
                        width: '100%',
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
          <When truthy={hasActiveStepSelected}>
            <FilterModal
              isOpen={filterOpen}
              cancel={() => {
                setFilterOpen(false);
              }}
              confirm={() => {
                setFilterOpen(false);
              }}
              control={control}
              stepIndex={activeStepIndex}
            />
          </When>
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
      <DeleteConfirmModal
        target={channel !== null && getChannel(channel ?? '')?.type === NodeTypeEnum.CHANNEL ? 'step' : 'action'}
        isOpen={toDelete.length > 0}
        confirm={confirmDelete}
        cancel={cancelDelete}
      />
    </>
  );
};

export default WorkflowEditor;

export const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;
