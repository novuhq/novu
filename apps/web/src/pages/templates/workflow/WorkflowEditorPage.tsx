import FlowEditor from '../../../components/workflow/FlowEditor';
import styled from '@emotion/styled';
import { Button, colors, DragButton, Switch, Text, Title } from '../../../design-system';
import { ActionIcon, Divider, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { Close } from '../../../design-system/icons/actions/Close';
import { channels, getChannel } from '../shared/channels';
import { useTemplateController, StepEntity } from '../../../components/templates/use-template-controller.hook';

const capitalize = (text: string) => {
  if (typeof text !== 'string') return '';

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const WorkflowEditorPage = ({
  setActivePage,
  templateId,
  setActiveStep,
}: {
  setActivePage: (string) => void;
  setActiveStep: any;
  templateId: string;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const [selectedChannel, setSelectedChannel] = useState<ChannelTypeEnum | null>(null);
  const [selectedStep, setSelectedStep] = useState<StepEntity | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const { addStep, stepFields, updateStep } = useTemplateController(templateId);

  useEffect(() => {
    if (selectedNodeId.length === 0) {
      return;
    }
    const step = stepFields.find((item) => item._id === selectedNodeId || item.id === selectedNodeId);
    if (!step) {
      return;
    }
    setSelectedStep(step);
    setSelectedChannel(step.template.type);
    setActiveStep(step._id || step.id);
  }, [selectedNodeId]);

  return (
    <div style={{ minHeight: 500 }}>
      <Grid gutter={0} grow style={{ minHeight: 500 }}>
        <Grid.Col md={9} sm={6}>
          <FlowEditor steps={stepFields} addStep={addStep} setSelectedNodeId={setSelectedNodeId} />
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={colorScheme === 'dark'}>
            {selectedChannel ? (
              <StyledNav>
                <NavSection>
                  <ButtonWrapper>
                    <Title size={2}>{getChannel(selectedChannel)?.label} Properties</Title>
                    <ActionIcon variant="transparent" onClick={() => setSelectedChannel(null)}>
                      <Close />
                    </ActionIcon>
                  </ButtonWrapper>
                </NavSection>
                <NavSection>
                  <EditTemplateButton
                    mt={10}
                    variant="outline"
                    fullWidth
                    onClick={() =>
                      setActivePage(
                        selectedChannel === ChannelTypeEnum.IN_APP ? selectedChannel : capitalize(selectedChannel)
                      )
                    }
                  >
                    Edit Template
                  </EditTemplateButton>
                  <Divider my={30} />
                  <StyledSwitch
                    checked={selectedStep?.active}
                    label={'Step is Active'}
                    onChange={(event) => {
                      if (!selectedStep) {
                        return;
                      }
                      const step = {
                        ...selectedStep,
                        active: !selectedStep?.active,
                      };
                      const index = stepFields.findIndex((item) =>
                        item._id === step?._id || item.id === step?.id ? step : item
                      );
                      updateStep(step, index);
                      setSelectedStep(step);
                    }}
                  />
                </NavSection>
              </StyledNav>
            ) : (
              <StyledNav>
                <NavSection>
                  <Title size={2}>Steps to add</Title>
                  <Text color={colors.B60} mt={10}>
                    You can drag and drop new steps to the flow
                  </Text>
                </NavSection>
                <Stack>
                  {channels.map((channel) => (
                    <div
                      key={channel.tabKey}
                      onDragStart={(event) => onDragStart(event, channel.channelType)}
                      draggable
                    >
                      <DragButton Icon={channel.Icon} description={channel.description} label={channel.label} />
                    </div>
                  ))}
                </Stack>
              </StyledNav>
            )}
          </SideBarWrapper>
        </Grid.Col>
      </Grid>
    </div>
  );
};

export default WorkflowEditorPage;

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)};
  height: 100%;
`;

const StyledNav = styled.div`
  padding: 15px 20px;
  height: 100%;
`;

const NavSection = styled.div`
  padding-bottom: 20px;
`;

const StyledSwitch = styled(Switch)`
  max-width: 150px !important;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const EditTemplateButton = styled(Button)`
  background-color: transparent;
`;
