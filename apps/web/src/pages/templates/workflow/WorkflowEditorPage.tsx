import FlowEditor from '../../../components/workflow/FlowEditor';
import styled from '@emotion/styled';
import { Button, colors, TemplateButton, DragButton, Text, Title } from '../../../design-system';
import { Center, createStyles, Grid } from '@mantine/core';
import { ArrowLeft, MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';
import React from 'react';
import { Background } from '../../../components/workflow/Background';
import PageHeader from '../../../components/layout/components/PageHeader';
import { ChannelTypeEnum } from '@novu/shared';

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
          <FlowEditor onGoBack={goBackHandler} />
        </Grid.Col>
        <Grid.Col md={3} sm={6}>
          <SideBarWrapper dark={true}>
            <StyledNav>
              <NavSection>
                <Title size={2}>Steps to add</Title>
                <Text color={colors.B60} mt={10}>
                  You can drag and drop new steps to the flow
                </Text>
              </NavSection>
              {channels.map((channel) => (
                <NavSection onDragStart={(event) => onDragStart(event, channel.channelType)} draggable>
                  <DragButton Icon={channel.Icon} description={channel.description} label={channel.label} />
                </NavSection>
              ))}
            </StyledNav>
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

const NavSection = styled.div``;

/*
 * const DragButton = styled(TemplateButton)`
 *   border: 1px dashed ${colors.B30} !important;
 *   border-radius: 7px;
 * `;
 */
