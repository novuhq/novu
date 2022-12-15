import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ActionIcon, Divider, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import { StepTypeEnum } from '@novu/shared';
import FlowEditor from '../../../components/workflow/FlowEditor';
import { Button, colors, DragButton, Text, Title } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { channels, getChannel, NodeTypeEnum } from '../shared/channels';
import { useTemplateController } from '../../../components/templates/use-template-controller.hook';
import { StepActiveSwitch } from './StepActiveSwitch';
import { useEnvController } from '../../../store/use-env-controller';
import { When } from '../../../components/utils/When';
import { PlusCircle, Trash } from '../../../design-system/icons';
import { TemplatePageHeader } from '../../../components/templates/TemplatePageHeader';
import { ActivePageEnum } from '../editor/TemplateEditorPage';
import { DigestMetadata } from './DigestMetadata';
import { DeleteConfirmModal } from '../../../components/templates/DeleteConfirmModal';
import { DelayMetadata } from './DelayMetadata';
import { FilterModal } from '../filter/FilterModal';
import { Filters } from '../filter/Filters';
import { ShouldStopOnFailSwitch } from './ShouldStopOnFailSwitch';

const capitalize = (text: string) => {
  return typeof text !== 'string' ? '' : text.charAt(0).toUpperCase() + text.slice(1);
};

const DraggableNode = ({ channel, setDragging, onDragStart }) => (
  <div
    key={channel.tabKey}
    data-test-id={`dnd-${channel.testId}`}
    onDragStart={(event) => {
      setDragging(true);
      onDragStart(event, channel.channelType);
    }}
    onDragEnd={() => {
      setDragging(false);
    }}
    draggable
  >
    <DragButton
      Icon={channel.Icon}
      description={channel.type === NodeTypeEnum.ACTION ? channel.description : ''}
      label={channel.label}
    />
  </div>
);

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
              return index === activeStep ? (
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
              ) : null;
            })}
          </When>
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'}>
            {selectedChannel ? (
              <StyledNav data-test-id="step-properties-side-menu">
                <When truthy={selectedChannel !== StepTypeEnum.DIGEST && selectedChannel !== StepTypeEnum.DELAY}>
                  <NavSection>
                    <ButtonWrapper>
                      <Title size={2}>{getChannel(selectedChannel)?.label} Properties</Title>
                      <ActionIcon
                        data-test-id="close-side-menu-btn"
                        variant="transparent"
                        onClick={() => setSelectedChannel(null)}
                      >
                        <Close />
                      </ActionIcon>
                    </ButtonWrapper>
                  </NavSection>
                  <NavSection>
                    <EditTemplateButton
                      mt={10}
                      variant="outline"
                      data-test-id="edit-template-channel"
                      fullWidth
                      onClick={() =>
                        setActivePage(
                          selectedChannel === StepTypeEnum.IN_APP ? selectedChannel : capitalize(selectedChannel)
                        )
                      }
                    >
                      Edit Template
                    </EditTemplateButton>
                    <Divider my={30} />
                    {steps.map((i, index) => {
                      return index === activeStep ? (
                        <Stack key={index}>
                          <StepActiveSwitch index={activeStep} control={control} />
                          <ShouldStopOnFailSwitch index={activeStep} control={control} />
                        </Stack>
                      ) : null;
                    })}
                  </NavSection>
                  <NavSection>
                    <Divider
                      style={{
                        marginBottom: '15px',
                      }}
                      label="Filters"
                      labelPosition="center"
                    />
                    {steps.map((i, index) => {
                      return index !== activeStep ? null : <Filters key={index} step={i} />;
                    })}
                    <FilterButton
                      fullWidth
                      variant="outline"
                      onClick={() => {
                        setFilterOpen(true);
                      }}
                      dark={colorScheme === 'dark'}
                    >
                      <PlusCircle
                        style={{
                          marginRight: '7px',
                        }}
                      />{' '}
                      Add filter
                    </FilterButton>
                  </NavSection>
                </When>
                <When truthy={selectedChannel === StepTypeEnum.DIGEST}>
                  <NavSection>
                    <ButtonWrapper>
                      <Title size={2}>Digest Properties</Title>
                      <ActionIcon
                        data-test-id="close-side-menu-btn"
                        variant="transparent"
                        onClick={() => setSelectedChannel(null)}
                      >
                        <Close />
                      </ActionIcon>
                    </ButtonWrapper>

                    <Text mr={10} mt={10} size="md" color={colors.B60}>
                      Configure the digest parameters. Read more about the digest engine{' '}
                      <a target={'_blank'} rel="noopener noreferrer" href={'https://docs.novu.co/platform/digest'}>
                        here
                      </a>
                      .
                    </Text>
                  </NavSection>
                  <NavSection>
                    {steps.map((i, index) => {
                      return index === activeStep ? (
                        <DigestMetadata
                          key={index}
                          control={control}
                          index={index}
                          loading={isLoading || isUpdateLoading}
                          disableSubmit={readonly || loadingEditTemplate || isLoading || !isDirty}
                          setSelectedChannel={setSelectedChannel}
                        />
                      ) : null;
                    })}
                  </NavSection>
                </When>
                <When truthy={selectedChannel === StepTypeEnum.DELAY}>
                  <NavSection>
                    <ButtonWrapper>
                      <Title size={2}>Delay Properties</Title>
                      <ActionIcon
                        data-test-id="close-side-menu-btn"
                        variant="transparent"
                        onClick={() => setSelectedChannel(null)}
                      >
                        <Close />
                      </ActionIcon>
                    </ButtonWrapper>

                    <Text mr={10} mt={10} size="md" color={colors.B60}>
                      Configure the delay parameters.
                    </Text>
                  </NavSection>
                  <NavSection>
                    {steps.map((i, index) => {
                      return index === activeStep ? (
                        <DelayMetadata key={index} control={control} index={index} />
                      ) : null;
                    })}
                  </NavSection>
                </When>
                <NavSection>
                  <DeleteStepButton
                    mt={10}
                    variant="outline"
                    data-test-id="delete-step-button"
                    onClick={() => {
                      onDelete(selectedNodeId);
                    }}
                  >
                    <Trash
                      style={{
                        marginRight: '5px',
                      }}
                    />
                    Delete {getChannel(selectedChannel)?.type === NodeTypeEnum.CHANNEL ? 'Step' : 'Action'}
                  </DeleteStepButton>
                </NavSection>
              </StyledNav>
            ) : (
              <StyledNav data-test-id="drag-side-menu">
                <NavSection>
                  <Title size={2}>Steps to add</Title>
                  <Text color={colors.B60} mt={5}>
                    <When truthy={!readonly}>Drag and drop new steps to the canvas</When>
                    <When truthy={readonly}>You can not drag and drop new steps in Production</When>
                  </Text>
                </NavSection>
                <When truthy={!readonly}>
                  <Stack spacing={18}>
                    {channels
                      .filter((channel) => channel.type === NodeTypeEnum.CHANNEL)
                      .map((channel, index) => (
                        <DraggableNode
                          key={index}
                          channel={channel}
                          setDragging={setDragging}
                          onDragStart={onDragStart}
                        />
                      ))}
                  </Stack>
                </When>
                <NavSection
                  style={{
                    marginTop: '15px',
                  }}
                >
                  <Title size={2}>Actions</Title>
                  <Text color={colors.B60} mt={5}>
                    <When truthy={!readonly}>Add actions to the flow</When>
                    <When truthy={readonly}>You can not drag and drop new actions in Production</When>
                  </Text>
                </NavSection>
                <When truthy={!readonly}>
                  <Stack spacing={18}>
                    {channels
                      .filter((channel) => channel.type === NodeTypeEnum.ACTION)
                      .map((channel, index) => (
                        <DraggableNode
                          key={index}
                          channel={channel}
                          setDragging={setDragging}
                          onDragStart={onDragStart}
                        />
                      ))}
                  </Stack>
                </When>
              </StyledNav>
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

const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;

const NavSection = styled.div`
  padding-bottom: 20px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const EditTemplateButton = styled(Button)`
  background-color: transparent;
`;

const DeleteStepButton = styled(Button)`
  position: absolute;
  bottom: 15px;
  left: 20px;
  right: 20px;
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
`;

const FilterButton = styled(Button)<{ dark: boolean }>`
  background: ${({ dark }) => (dark ? colors.B20 : colors.white)};
  box-shadow: 0px 5px 20px rgb(0 0 0 / 20%);
  :hover {
    background-color: ${({ dark }) => (dark ? colors.B20 : colors.white)};
  }
`;
