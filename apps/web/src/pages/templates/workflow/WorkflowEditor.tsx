import { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Group, Stack } from '@mantine/core';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';

import { FlowEditor } from '../../../components/workflow';
import { channels } from '../../../utils/channels';
import type { IForm } from '../components/formTypes';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { useBasePath } from '../hooks/useBasePath';
import { UpdateButton } from '../components/UpdateButton';
import { NameInput } from './NameInput';
import { Settings } from '../../../design-system/icons';
import { Button } from '../../../design-system';
import ChannelNode from './workflow/node-types/ChannelNode';
import TriggerNode from './workflow/node-types/TriggerNode';
import AddNode from './workflow/node-types/AddNode';
import { AddNodeEdge } from './workflow/edge-types/AddNodeEdge';
import { getFormattedStepErrors } from './utils/getFormattedStepErrors';
import { useSaveTemplate } from '../hooks/useSaveTemplate';
import { useDeleteTemplate } from '../hooks/useDeleteTemplate';
import { TemplateValidationModal } from '../components/TemplateValidationModal';
import { useTemplateDeleteModal } from '../hooks/useTemplateDeleteModal';

const nodeTypes = {
  triggerNode: TriggerNode,
  channelNode: ChannelNode,
  addNode: AddNode,
};

const edgeTypes = {
  special: AddNodeEdge,
};

export function WorkflowEditor() {
  const { id } = useParams();
  const { formState, getValues } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = useBasePath(pathname);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [templateValidationVisible, setTemplateValidationVisible] = useState(false);
  const { setStep, removeStep, swapSteps } = useTemplateEditorForm();
  const saveTemplate = useSaveTemplate();
  const deleteTemplate = useDeleteTemplate();
  const templateDeleteModal = useTemplateDeleteModal();

  const { errors, isDirty, isValidating, isSubmitting } = formState;
  const steps = getValues('steps');

  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    const validationErrors = await saveTemplate();

    if (validationErrors.length === 0) {
      navigate(basePath);
    } else {
      setTemplateValidationVisible(true);
    }
  }, [isDirty, navigate, basePath, saveTemplate]);

  const handleDelete = useCallback(async () => {
    const hasDeletePermission = !readonly && !isValidating && isDirty;

    if (hasDeletePermission) {
      setDeleteConfirmVisible(true);
    }
  }, [readonly, isValidating, isDirty]);

  const handleConfirmDelete = useCallback(async () => {
    await deleteTemplate();
    templateDeleteModal.hide();
    navigate(basePath);
  }, [deleteTemplate, templateDeleteModal, navigate, basePath]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmVisible(false);
  }, []);

  const handleCancelTemplateValidation = useCallback(() => {
    setTemplateValidationVisible(false);
  }, []);

  const handleValidateTemplate = useCallback(async () => {
    const validationErrors = await saveTemplate();
    if (validationErrors.length === 0) {
      navigate(basePath);
    } else {
      setTemplateValidationVisible(true);
    }
  }, [saveTemplate, navigate, basePath]);

  const handleAddStep = useCallback(
    async (channelType: StepTypeEnum, id: string, index?: number) => {
      const newStep = {
        uuid: id,
        name: '',
        active: true,
        template: {
          type: channelType,
          parts: [{ type: FilterPartTypeEnum.Channel, channel: channels.find((channel) => channel.channelType === channelType)?.uuid }],
        },
      };

      setStep(newStep, index);

      if (index !== undefined && index > steps.length - 1) {
        setStep(getValues('steps')[index], index);
        removeStep(steps.length - 1);
      }

      handleSave();
    },
    [handleSave, removeStep, setStep, steps, getValues]
  );

  const handleReorderSteps = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return;
      swapSteps(startIndex, endIndex);
      handleSave();
    },
    [handleSave, swapSteps]
  );

  return (
    <Container size={1} padding="md">
      <Stack spacing="md">
        <Group>
          <Group>
            <NameInput />
            <Button
              variant="outline"
              leftIcon={<Settings />}
              size="sm"
              onClick={() => navigate(`${basePath}/settings`)}
              color="blue"
            >
              Settings
            </Button>
          </Group>
          <Group align="center" justify="flex-end">
            <Button onClick={handleDelete} color="red">
              Delete
            </Button>
            <UpdateButton isSubmitting={isSubmitting} isDirty={isDirty} onClick={handleSave} />
          </Group>
        </Group>

        <FlowEditor
          steps={steps}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          withControls={!readonly}
          dragging={false}
          addStep={handleAddStep}
          onDelete={removeStep}
          onStepInit={() => {}}
          onGetStepError={(i, errors) => getFormattedStepErrors(errors, i)}
          onReorder={handleReorderSteps}
          readonly={readonly}
        />
      </Stack>

      <Link to={basePath}>Back</Link>
      <Outlet />

      <When condition={deleteConfirmVisible}>
        <DeleteConfirmModal
          isOpen={deleteConfirmVisible}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </When>

      <When condition={templateValidationVisible}>
        <TemplateValidationModal
          isOpen={templateValidationVisible}
          onCancel={handleCancelTemplateValidation}
          onValidate={handleValidateTemplate}
          validationErrors={errors}
        />
      </When>
    </Container>
  );
}
