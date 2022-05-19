import FlowEditor from '../../../components/workflow/FlowEditor';
import styled from '@emotion/styled';
import { Button, colors, DragButton, Text, Title } from '../../../design-system';
import { ActionIcon, Grid, Stack } from '@mantine/core';
import React, { useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { Close } from '../../../design-system/icons/actions/Close';
import { ReactFlowProvider } from 'react-flow-renderer';
import { channels, getChannel } from '../shared/channels';

const WorkflowEditorPage = ({
  channelButtons,
  changeTab,
  handleAddChannel,
}: {
  channelButtons: string[];
  changeTab: (string) => void;
  handleAddChannel: (string) => void;
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelTypeEnum | null>(null);
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const goBackHandler = () => {
    changeTab('Settings');
  };

  return (
    <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
      <Grid grow style={{ minHeight: 500 }}>
        <Grid.Col md={9} sm={6}>
          <ReactFlowProvider>
            <FlowEditor
              channelButtons={channelButtons}
              setSelected={setSelectedChannel}
              changeTab={changeTab}
              onGoBack={goBackHandler}
            />
          </ReactFlowProvider>
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={true}>
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
                  <Button variant="outline" fullWidth onClick={() => handleAddChannel(selectedChannel)}>
                    Edit Template
                  </Button>
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
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.BGLight)};
  height: 100%;
`;

const StyledNav = styled.div`
  padding: 15px 20px;
`;

const NavSection = styled.div`
  padding-bottom: 20px;
`;

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;
