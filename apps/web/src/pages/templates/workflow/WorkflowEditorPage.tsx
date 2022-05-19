import FlowEditor from '../../../components/workflow/FlowEditor';
import styled from '@emotion/styled';
import { Button, colors, DragButton, Text, Title } from '../../../design-system';
import { ActionIcon, Grid } from '@mantine/core';
import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import React, { useEffect, useState } from 'react';
import { ChannelTypeEnum } from '@novu/shared';
import { Close } from '../../../design-system/icons/actions/Close';

export const channels = [
  {
    tabKey: ChannelTypeEnum.IN_APP,
    label: 'In-App',
    description: 'Send notifications to the in-app notification center',
    Icon: MobileGradient,
    testId: 'inAppSelector',
    channelType: ChannelTypeEnum.IN_APP,
  },
  {
    tabKey: ChannelTypeEnum.EMAIL,
    label: 'Email',
    description: 'Send using one of our email integrations',
    Icon: MailGradient,
    testId: 'emailSelector',
    channelType: ChannelTypeEnum.EMAIL,
  },
  {
    tabKey: ChannelTypeEnum.SMS,
    label: 'SMS',
    description: "Send an SMS directly to the user's phone",
    Icon: SmsGradient,
    testId: 'smsSelector',
    channelType: ChannelTypeEnum.SMS,
  },
];

const WorkflowEditorPage = ({ changeTab }: { changeTab: (string) => void }) => {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState('');
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  useEffect(() => {
    if (selected === '') {
      setShow(false);
    } else {
      setShow(true);
    }
  }, [selected]);

  const goBackHandler = () => {
    changeTab('Settings');
  };

  return (
    <div style={{ marginLeft: 12, marginRight: 12, padding: 17.5, minHeight: 500 }}>
      <Grid grow style={{ minHeight: 500 }}>
        <Grid.Col md={9} sm={6}>
          <FlowEditor setSelected={setSelected} changeTab={changeTab} onGoBack={goBackHandler} />
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={true}>
            {show ? (
              <StyledNav>
                <NavSection>
                  <ButtonWrapper>
                    <Title size={2}>{selected} Properties</Title>
                    <ActionIcon variant="transparent" onClick={() => setSelected('')}>
                      <Close />
                    </ActionIcon>
                  </ButtonWrapper>
                </NavSection>
                <NavSection>
                  <Button variant="outline" fullWidth onClick={() => changeTab(selected)}>
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
                {channels.map((channel) => (
                  <NavSection
                    key={channel.tabKey}
                    onDragStart={(event) => onDragStart(event, channel.channelType)}
                    draggable
                  >
                    <DragButton Icon={channel.Icon} description={channel.description} label={channel.label} />
                  </NavSection>
                ))}
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
