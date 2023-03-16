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
import { EditorPages } from '../editor/TemplateEditorPage';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { FilterModal } from '../filter/FilterModal';
import { StepSettings } from './SideBar/StepSettings';
import { AddStepMenu } from './SideBar/AddStepMenu';
import { useTemplateFetcher } from '../../../api/hooks';
import { ActivePageEnum } from '../../../constants/editorEnums';
import { useTemplateEditorContext } from '../editor/TemplateEditorProvider';

const WorkflowEditor = ({
  setActivePage,
  templateId,
  activePage,
  onTestWorkflowClicked,
  isCreatingTemplate,
  isUpdatingTemplate,
  addStep,
  deleteStep,
}: {
  setActivePage: (string) => void;
  templateId: string;
  activePage: ActivePageEnum;
  onTestWorkflowClicked: () => void;
  isCreatingTemplate: boolean;
  isUpdatingTemplate: boolean;
  addStep: (channelType: StepTypeEnum, id: string, index?: number) => void;
  deleteStep: (index: number) => void;
}) => {
  const { setSelectedNodeId, activeStepIndex, selectedChannel } = useTemplateEditorContext();
  const hasActiveStepSelected = activeStepIndex >= 0;
  const { colorScheme } = useMantineColorScheme();
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
  const { isInitialLoading: loadingEditTemplate } = useTemplateFetcher({ templateId });

  const [filterOpen, setFilterOpen] = useState(false);
  const steps = watch('steps');

  const { readonly } = useEnvController();
  const [toDelete, setToDelete] = useState<string>('');

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

  useEffect(() => {
    setSelectedNodeId('');
  }, []);

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
            errors={errors}
            steps={steps}
            addStep={addStep}
            setSelectedNodeId={setSelectedNodeId}
          />
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
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'}>
            {selectedChannel ? (
              <StepSettings
                setActivePage={setActivePageWrapper}
                setFilterOpen={setFilterOpen}
                isLoading={isCreatingTemplate}
                isUpdateLoading={isUpdatingTemplate}
                loadingEditTemplate={loadingEditTemplate}
                onDelete={onDelete}
              />
            ) : (
              <AddStepMenu setDragging={setDragging} onDragStart={onDragStart} />
            )}
          </SideBarWrapper>
        </Grid.Col>
      </Grid>
      <DeleteConfirmModal
        target={
          selectedChannel !== null && getChannel(selectedChannel ?? '')?.type === NodeTypeEnum.CHANNEL
            ? 'step'
            : 'action'
        }
        isOpen={toDelete.length > 0}
        confirm={confirmDelete}
        cancel={cancelDelete}
      />
    </>
  );
};

export default WorkflowEditor;

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)};
  height: 100%;
  position: relative;
`;

export const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;
