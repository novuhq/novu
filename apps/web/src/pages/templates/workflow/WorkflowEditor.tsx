import 'reactflow/dist/style.css';
import { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container, Group, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
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
import { getFormattedStepErrors } from '../shared/errors';

const nodeTypes = {
  channelNode: ChannelNode,
  triggerNode: TriggerNode,
  addNode: AddNode,
};

const edgeTypes = { special: AddNodeEdge };

const WorkflowEditor = () => {
  const { addStep, deleteStep } = useTemplateEditorForm();
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const [dragging, setDragging] = useState(false);

  const {
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const steps = watch('steps');

  const [toDelete, setToDelete] = useState<string>('');
  const basePath = useBasePath();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const onNodeClick = useCallback(
    (event, node) => {
      event.preventDefault();

      if (node.type === 'channelNode') {
        navigate(basePath + `/${node.data.channelType}/${node.data.uuid}`);
      }
      if (node.type === 'triggerNode') {
        navigate(basePath + '/test-workflow');
      }
    },
    [basePath]
  );

  const confirmDelete = () => {
    const index = steps.findIndex((item) => item.uuid === toDelete);
    deleteStep(index);
    setToDelete('');
    navigate(basePath);
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

  const onStepInit = async () => {
    await trigger('steps');
  };

  const onGetStepError = (i: number) => getFormattedStepErrors(i, errors);

  if (readonly && pathname === basePath) {
    return (
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
                <NameInput />
                <UpdateButton />
                <Button
                  onClick={() => {
                    navigate(basePath + '/snippet');
                  }}
                  data-test-id="get-snippet-btn"
                >
                  Get Snippet
                </Button>
                <Link data-test-id="settings-page" to="settings">
                  <Settings />
                </Link>
              </Group>
            </Stack>
          </Container>
          <FlowEditor
            onDelete={onDelete}
            dragging={dragging}
            errors={errors}
            steps={steps}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            addStep={addStep}
            onStepInit={onStepInit}
            onGetStepError={onGetStepError}
            onNodeClick={onNodeClick}
          />
        </div>
      </div>
    );
  }

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
      <When truthy={readonly && pathname === basePath}>{null}</When>
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
                  <NameInput />
                  <When truthy={pathname !== basePath}>
                    <UpdateButton />
                  </When>
                </Group>
              </Stack>
            </Container>
            <FlowEditor
              onDelete={onDelete}
              dragging={dragging}
              errors={errors}
              steps={steps}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              addStep={addStep}
              onStepInit={onStepInit}
              onGetStepError={onGetStepError}
              onNodeClick={onNodeClick}
            />
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
