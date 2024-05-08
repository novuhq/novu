import { Container, Group, Stack } from '@mantine/core';
import { ComponentType, useCallback, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Node, NodeProps } from 'react-flow-renderer';
import { useDidUpdate, useTimeout } from '@mantine/hooks';
import { FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';
import { useAuthContext, useSegment } from '@novu/shared-web';

import { When } from '../../../components/utils/When';
import type { IFlowEditorProps } from '../../../components/workflow';
import { FlowEditor } from '../../../components/workflow';
import { Bolt, Button, Settings } from '@novu/design-system';
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
import { NodeType, NodeData } from '../../../components/workflow/types';
import { useStepInfoPath } from '../hooks/useStepInfoPath';
import { useNavigateToVariantPreview } from '../hooks/useNavigateToVariantPreview';
import { useOnboardingExperiment } from '../../../hooks/useOnboardingExperiment';
import { OnBoardingAnalyticsEnum } from '../../quick-start/consts';

export const TOP_ROW_HEIGHT = 74;

const nodeTypes: Record<string, ComponentType<NodeProps>> = {
  [NodeType.CHANNEL]: ChannelNode,
  [NodeType.TRIGGER]: TriggerNode,
  [NodeType.ADD_NODE]: AddNode,
};

const edgeTypes = { special: AddNodeEdge };

const WorkflowEditor = () => {
  const { addStep, deleteStep, template } = useTemplateEditorForm();
  const { isUnderVariantsListPath } = useStepInfoPath();
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const { navigateToVariantPreview } = useNavigateToVariantPreview();
  const [dragging, setDragging] = useState(false);
  const segment = useSegment();
  const { isOnboardingExperimentEnabled } = useOnboardingExperiment();
  const { currentOrganization } = useAuthContext();

  const {
    control,
    trigger,
    formState: { errors, isDirty },
  } = useFormContext<IForm>();
  const { readonly, chimera } = useEnvController({}, template?.chimera);
  const steps = useWatch({
    name: 'steps',
    control,
  });
  const tags = useWatch({ name: 'tags' });

  const tagsIncludesOnboarding = tags?.includes('onboarding') && isOnboardingExperimentEnabled;

  const [toDelete, setToDelete] = useState<string>('');
  const basePath = useBasePath();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const onNodeClick = useCallback(
    (event, node: Node<NodeData>) => {
      event.preventDefault();
      const { step, channelType } = node.data;
      const isVariant = step && step.variants && step.variants?.length > 0;
      if (isVariant) {
        navigateToVariantPreview({
          channel: channelType,
          stepUuid: step.uuid,
          variantUuid: step.uuid,
        });
      } else if (node.type === NodeType.CHANNEL) {
        navigate(basePath + `/${channelType}/${step?.uuid ?? ''}/preview`);
      } else if (node.type === NodeType.TRIGGER) {
        navigate(basePath + '/test-workflow');
      }
    },
    [navigate, basePath, navigateToVariantPreview]
  );

  const onEdit: IFlowEditorProps['onEdit'] = (_, node) => {
    if (node.type === NodeType.CHANNEL) {
      navigate(basePath + `/${node.data.channelType}/${node.data.step?.uuid ?? ''}`);
    }
  };

  const onAddVariant = (uuid: string) => {
    const channelStep = steps.find((step) => step.uuid === uuid);

    if (channelStep) {
      navigate(basePath + `/${channelStep.template.type}/${uuid}/variants/create`);
    }
  };

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
                <Bolt color="#4c6dd4" width="24px" height="24px" />
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
            isReadonly
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
            onEdit={onEdit}
            onAddVariant={onAddVariant}
          />
        </div>
      </div>
    );
  }

  const isEmailChannel = channel && [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel);
  const isPreviewPath = pathname.endsWith('/preview');

  return (
    <>
      <When truthy={!isUnderVariantsListPath && !isPreviewPath && isEmailChannel}>
        <Outlet
          context={{
            setDragging,
            onDelete,
          }}
        />
      </When>
      <When
        truthy={
          !channel ||
          ![StepTypeEnum.EMAIL, StepTypeEnum.IN_APP].includes(channel) ||
          isUnderVariantsListPath ||
          isPreviewPath
        }
      >
        <div style={{ display: 'flex', flexFlow: 'row', position: 'relative' }}>
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
                  <When truthy={chimera}>
                    <Bolt color="#4c6dd4" width="24px" height="24px" />
                  </When>
                  <NameInput />
                  <When truthy={!channel}>
                    <Group>
                      <UpdateButton />
                    </Group>
                  </When>
                  <When truthy={pathname === basePath}>
                    <Button
                      pulse={tagsIncludesOnboarding || shouldPulse}
                      onClick={() => {
                        if (tagsIncludesOnboarding) {
                          segment.track(OnBoardingAnalyticsEnum.ONBOARDING_EXPERIMENT_TEST_NOTIFICATION, {
                            action: 'Workflow - Send test notification',
                            experiment_id: '2024-w9-onb',
                            _organization: currentOrganization?._id,
                          });
                          navigate(basePath + '/test-workflow');
                        } else {
                          navigate(basePath + '/snippet');
                        }
                      }}
                      data-test-id="get-snippet-btn"
                    >
                      Trigger Notification
                    </Button>
                    <Link data-test-id="settings-page" to="settings">
                      <Settings />
                    </Link>
                  </When>
                </Group>
              </Stack>
            </Container>
            <FlowEditor
              isReadonly={readonly}
              onEdit={onEdit}
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
              onAddVariant={onAddVariant}
              sidebarOpen={!(pathname === basePath)}
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
