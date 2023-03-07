import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { Grid, useMantineColorScheme } from '@mantine/core';
import { StepTypeEnum } from '@novu/shared';

import FlowEditor from './workflow/FlowEditor';
import { colors } from '../../../design-system';
import { getChannel, NodeTypeEnum } from '../shared/channels';
import type { IForm } from '../components/formTypes';
import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { TemplatePageHeader } from '../components/TemplatePageHeader';
import { ActivePageEnum, EditorPages } from '../editor/TemplateEditorPage';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { FilterModal } from '../filter/FilterModal';
import { SelectedStep } from './SideBar/SelectedStep';
import { AddStepMenu } from './SideBar/AddStepMenu';
import { useTemplateFetcher } from '../components/useTemplateFetcher';

const WorkflowEditorPage = ({
  setActivePage,
  templateId,
  setActiveStep,
  activePage,
  activeStep,
  onTestWorkflowClicked,
  isCreatingTemplate,
  isUpdatingTemplate,
  addStep,
  deleteStep,
}: {
  setActivePage: (string) => void;
  setActiveStep: any;
  templateId: string;
  activePage: ActivePageEnum;
  activeStep: number;
  onTestWorkflowClicked: () => void;
  isCreatingTemplate: boolean;
  isUpdatingTemplate: boolean;
  addStep: (channelType: StepTypeEnum, id: string, index?: number) => void;
  deleteStep: (index: number) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const [selectedChannel, setSelectedChannel] = useState<StepTypeEnum | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [dragging, setDragging] = useState(false);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const {
    control,
    watch,
    clearErrors,
    formState: { errors, isDirty: isDirtyForm, isSubmitted },
  } = useFormContext<IForm>();
  const { loading: loadingEditTemplate } = useTemplateFetcher(templateId);

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

  const setActivePageWrapper = (page: ActivePageEnum) => {
    if (!isSubmitted && EditorPages.includes(page)) {
      clearErrors('steps');
    }
    setActivePage(page);
  };

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
            loading={isCreatingTemplate || isUpdatingTemplate}
            disableSubmit={readonly || loadingEditTemplate || isCreatingTemplate || !isDirtyForm}
            templateId={templateId}
            setActivePage={setActivePage}
            activePage={activePage}
            onTestWorkflowClicked={onTestWorkflowClicked}
          />
          <FlowEditor
            activePage={activePage}
            onDelete={onDelete}
            setActivePage={setActivePageWrapper}
            dragging={dragging}
            templateId={templateId}
            errors={errors}
            steps={steps}
            addStep={addStep}
            setSelectedNodeId={setSelectedNodeId}
          />
          <When truthy={selectedChannel !== null && getChannel(selectedChannel)?.type !== NodeTypeEnum.ACTION}>
            {steps.map((step, index) => {
              return (
                <When key={step._id || step.id} truthy={index === activeStep}>
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
                setActivePage={setActivePageWrapper}
                steps={steps}
                activeStep={activeStep}
                control={control}
                errors={errors}
                setFilterOpen={setFilterOpen}
                isLoading={isCreatingTemplate}
                isUpdateLoading={isUpdatingTemplate}
                loadingEditTemplate={loadingEditTemplate}
                isDirty={isDirtyForm}
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
