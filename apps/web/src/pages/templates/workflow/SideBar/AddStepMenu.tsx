import React from 'react';
import { Stack } from '@mantine/core';
import { colors, DragButton, Text, Title } from '../../../../design-system';
import { channels, NodeTypeEnum } from '../../shared/channels';
import { useEnvController } from '../../../../hooks';
import { When } from '../../../../components/utils/When';
import { NavSection } from '../../components/TemplatesSideBar';
import { StyledNav } from '../WorkflowEditorPage';

export function AddStepMenu({
  setDragging,
  onDragStart,
}: {
  setDragging: (value: ((prevState: boolean) => boolean) | boolean) => void;
  onDragStart: (event, nodeType) => void;
}) {
  const { readonly } = useEnvController();

  return (
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
              <DraggableNode key={index} channel={channel} setDragging={setDragging} onDragStart={onDragStart} />
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
              <DraggableNode key={index} channel={channel} setDragging={setDragging} onDragStart={onDragStart} />
            ))}
        </Stack>
      </When>
    </StyledNav>
  );
}

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
    role="presentation"
    aria-grabbed="true"
  >
    <DragButton
      Icon={channel.Icon}
      description={channel.type === NodeTypeEnum.ACTION ? channel.description : ''}
      label={channel.label}
    />
  </div>
);
