import React from 'react';
import { Stack, Title } from '@mantine/core';
import { colors, DragButton, Text } from '../../../../design-system';
import { channels, NodeTypeEnum } from '../../shared/channels';
import { useEnvController } from '../../../../hooks';
import { When } from '../../../../components/utils/When';
import { StyledNav } from '../WorkflowEditor';

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
      <div>
        <Title color={colors.B60} size={16} mb={16}>
          Channels
        </Title>
      </div>
      <When truthy={!readonly}>
        <Stack spacing={18}>
          {channels
            .filter((channel) => channel.type === NodeTypeEnum.CHANNEL)
            .map((channel, index) => (
              <DraggableNode key={index} channel={channel} setDragging={setDragging} onDragStart={onDragStart} />
            ))}
        </Stack>
      </When>
      <div
        style={{
          marginTop: '15px',
        }}
      >
        <Title color={colors.B60} size={16} mb={16}>
          Actions
        </Title>
      </div>
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
    <DragButton Icon={channel.Icon} description={''} label={channel.label} />
  </div>
);
