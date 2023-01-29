import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Grid, useMantineColorScheme } from '@mantine/core';
import { StepTypeEnum } from '@novu/shared';
import FlowEditor from '../../../components/workflow/FlowEditor';
import { colors } from '../../../design-system';
import { getChannel, NodeTypeEnum } from '../shared/channels';
import { useTemplateController } from '../../../components/templates/useTemplateController';
import { useEnvController } from '../../../store/useEnvController';
import { When } from '../../../components/utils/When';
import { TemplatePageHeader } from '../../../components/templates/TemplatePageHeader';
import { ActivePageEnum } from '../editor/TemplateEditorPage';
import { DeleteConfirmModal } from '../../../components/templates/DeleteConfirmModal';
import { FilterModal } from '../filter/FilterModal';
import { SelectedStep } from './SideBar/SelectedStep';
import { AddStepMenu } from './SideBar/AddStepMenu';

const WorkflowEditorPage = ({
  setActivePage,
  templateId,
  setActiveStep,
  activePage,
  activeStep,
  onTestWorkflowClicked,
}: {
  setActivePage: (string) => void;
  setActiveStep: any;
  templateId: string;
  activePage: ActivePageEnum;
  activeStep: number;
  onTestWorkflowClicked: () => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const [selectedChannel, setSelectedChannel] = useState<StepTypeEnum | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [dragging, setDragging] = useState(false);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const { addStep, deleteStep, control, watch, errors } = useTemplateController(templateId);
  const { isLoading, isUpdateLoading, loadingEditTemplate, isDirty } = useTemplateController(templateId);
  const [filterOpen, setFilterOpen] = useState(false);
  const steps = watch('steps');

  const { readonly } = useEnvController();
  const [toDelete, setToDelete] = useState<string>('');

  useEffect(() => {
    if (selectedNodeId.length === 0) {
      setSelectedChannel(null);

      return;
    }
    const step = steps.find((item) => item._id === selectedNodeId || item.id === selectedNodeId);
    const index = steps.findIndex((item) => item._id === selectedNodeId || item.id === selectedNodeId);
    if (!step) {
      return;
    }
    setSelectedChannel(step.template.type);
    setActiveStep(index);
  }, [selectedNodeId]);

  const confirmDelete = () => {
    const index = steps.findIndex((item) => item._id === toDelete);
    deleteStep(index);
    setSelectedNodeId('');
    setToDelete('');
  };

  const cancelDelete = () => {
    setToDelete('');
  };

  const onDelete = (id) => {
    setToDelete(id);
  };

  return (
    <>
      <Grid gutter={0} grow style={{ minHeight: '100%' }}>
        <Grid.Col
          md={9}
          sm={6}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - var(--mantine-header-height, 0px) - 60px)',
          }}
        >
          <TemplatePageHeader
            loading={isLoading || isUpdateLoading}
            disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
            templateId={templateId}
            setActivePage={setActivePage}
            activePage={activePage}
            onTestWorkflowClicked={onTestWorkflowClicked}
          />
          <FlowEditor
            activePage={activePage}
            onDelete={onDelete}
            setActivePage={setActivePage}
            dragging={dragging}
            templateId={templateId}
            errors={errors}
            steps={steps}
            addStep={addStep}
            setSelectedNodeId={setSelectedNodeId}
          />
          <When truthy={selectedChannel !== null && getChannel(selectedChannel)?.type !== NodeTypeEnum.ACTION}>
            {steps.map((i, index) => {
              return (
                <When truthy={index === activeStep}>
                  <FilterModal
                    key={index}
                    isOpen={filterOpen}
                    cancel={() => {
                      setFilterOpen(false);
                    }}
                    confirm={() => {
                      setFilterOpen(false);
                    }}
                    control={control}
                    stepIndex={activeStep}
                  />
                </When>
              );
            })}
          </When>
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'}>
            {selectedChannel ? (
              <SelectedStep
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                setActivePage={setActivePage}
                steps={steps}
                activeStep={activeStep}
                control={control}
                errors={errors}
                setFilterOpen={setFilterOpen}
                colorScheme={colorScheme}
                isLoading={isLoading}
                isUpdateLoading={isUpdateLoading}
                loadingEditTemplate={loadingEditTemplate}
                isDirty={isDirty}
                onDelete={onDelete}
                selectedNodeId={selectedNodeId}
              />
            ) : (
              <AddStepMenu setDragging={setDragging} onDragStart={onDragStart} />
            )}
          </SideBarWrapper>
        </Grid.Col>
      </Grid>
      <DeleteConfirmModal
        target={
          selectedChannel !== null && getChannel(selectedChannel)?.type === NodeTypeEnum.CHANNEL ? 'step' : 'action'
        }
        isOpen={toDelete.length > 0}
        confirm={confirmDelete}
        cancel={cancelDelete}
      />
    </>
  );
};

export default WorkflowEditorPage;

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)};
  height: 100%;
  position: relative;
`;

export const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;
