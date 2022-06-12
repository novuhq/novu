import FlowEditor from '../../../components/workflow/FlowEditor';
import styled from '@emotion/styled';
import { Button, colors, DragButton, Switch, Text, Title } from '../../../design-system';
import { ActionIcon, Divider, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import React, { useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { Close } from '../../../design-system/icons/actions/Close';
import { ReactFlowProvider } from 'react-flow-renderer';
import { channels, getChannel } from '../shared/channels';

const WorkflowEditorPage = ({
  channelButtons,
  handleAddChannel,
  activeChannels,
  toggleChannel,
}: {
  channelButtons: string[];
  handleAddChannel: (string) => void;
  activeChannels: { [p: string]: boolean };
  toggleChannel: (channel: ChannelTypeEnum, active: boolean) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const [selectedChannel, setSelectedChannel] = useState<ChannelTypeEnum | null>(null);
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ minHeight: 500 }}>
      <Grid gutter={0} grow style={{ minHeight: 500 }}>
        <Grid.Col md={9} sm={6}>
          <ReactFlowProvider>
            <FlowEditor channelButtons={channelButtons} setSelected={setSelectedChannel} />
          </ReactFlowProvider>
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
                    data-test-id="edit-template-channel"
                    fullWidth
                    onClick={() => handleAddChannel(selectedChannel)}
                  >
                    Edit Template
                  </EditTemplateButton>
                  <Divider my={30} />
                  <StyledSwitch
                    label={'Step is Active'}
                    checked={activeChannels[selectedChannel]}
                    onChange={(event) => {
                      toggleChannel(selectedChannel, event.target.checked);
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
                      data-test-id={channel.testId}
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
