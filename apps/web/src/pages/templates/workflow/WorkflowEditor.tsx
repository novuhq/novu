import { Container, Group, Stack, useMantineColorScheme } from '@mantine/core';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDidUpdate, useTimeout } from '@mantine/hooks';
import { When } from '../../../components/utils/When';
import { FlowEditor } from '../../../components/workflow';
import { Button } from '../../../design-system';
import { Settings } from '../../../design-system/icons';
import { useEnvController } from '../../../hooks';
import { channels } from '../../../utils/channels';
import { errorMessage } from '../../../utils/notifications';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import type { IForm } from '../components/formTypes';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { UpdateButton } from '../components/UpdateButton';
import { useBasePath } from '../hooks/useBasePath';
import { getFormattedStepErrors } from '../shared/errors';
import { NameInput } from './NameInput';
import { AddNodeEdge } from './workflow/edge-types/AddNodeEdge';
import AddNode from './workflow/node-types/AddNode';
import ChannelNode from './workflow/node-types/ChannelNode';
import TriggerNode from './workflow/node-types/TriggerNode';

export const TOP_ROW_HEIGHT = 74;

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
    formState: { errors, isDirty },
  } = useFormContext<IForm>();
  const { readonly } = useEnvController();
  const steps = watch('steps');

  const [toDelete, setToDelete] = useState<string>('');
  const basePath = useBasePath();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

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
    [navigate, basePath]
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

      errorMessage(
        `${label} ${
          sameTypeSteps.length > 1 ? `(${foundIndex + 1}) ` : ''
        } filters is depending on the step you try to delete`
      );

      return;
    }

    setToDelete(uuid);
  };

  const onStepInit = async () => {
    await trigger('steps');
  };

  const onGetStepError = (i: number) => getFormattedStepErrors(i, errors);

  const [shouldPulse, setShouldPulse] = useState(false);

  useDidUpdate(() => {
    if (isDirty) {
      return;
    }
    setShouldPulse(true);
    start();
  }, [isDirty]);

  const { start } = useTimeout(() => {
    setShouldPulse(false);
  }, 5000);

  if (readonly && pathname === basePath) {
    return (
      <div style={{ display: 'flex', flexFlow: 'row' }}>
        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexFlow: 'Column',
          }}
        >
          <Container fluid sx={{ width: '100%', height: `${TOP_ROW_HEIGHT}px` }}>
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
      <When truthy={!channel || ![StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel)}>
        <div style={{ display: 'flex', flexFlow: 'row', position: 'relative' }}>
          <div
            style={{
              flex: '1 1 auto',
              display: 'flex',
              flexFlow: 'column',
            }}
          >
            <Container fluid sx={{ width: '100%', height: `${TOP_ROW_HEIGHT}px` }}>
              <Stack
                justify="center"
                sx={{
                  height: '100%',
                }}
              >
                <Group>
                  <NameInput />
                  <Group>
                    <UpdateButton />
                  </Group>
                  <When truthy={pathname === basePath}>
                    <Button
                      pulse={shouldPulse}
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
          <Outlet
            context={{
              setDragging,
              onDelete,
            }}
          />
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
