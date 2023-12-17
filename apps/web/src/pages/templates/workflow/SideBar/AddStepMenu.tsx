import styled from '@emotion/styled';
import { Stack, Title } from '@mantine/core';
import { When } from '../../../../components/utils/When';
import { colors, DragButton, Tooltip } from '@novu/design-system';
import { useEnvController } from '../../../../hooks';
import { channels, NodeTypeEnum } from '../../../../utils/channels';
import { TOP_ROW_HEIGHT } from '../WorkflowEditor';

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
        <Title color={colors.B60} size={14} mb={12} ta="center">
          Actions
        </Title>
      </div>
      <When truthy={!readonly}>
        <Stack spacing={18} mb={16}>
          {channels
            .filter((channel) => channel.type === NodeTypeEnum.ACTION)
            .map((channel, index) => (
              <DraggableNode key={index} channel={channel} setDragging={setDragging} onDragStart={onDragStart} />
            ))}
        </Stack>
      </When>

      <div
        style={{
          marginTop: '24px',
        }}
      >
        <Title color={colors.B60} size={14} mb={12} ta="center">
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
    </StyledNav>
  );
}

const DraggableNode = ({ channel, setDragging, onDragStart }) => (
  <Tooltip label={channel.label} position="left" offset={18}>
    <StyledDraggableNode
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
      <DragButton Icon={channel.Icon} description={''} />
    </StyledDraggableNode>
  </Tooltip>
);

const StyledNav = styled.div`
  padding: 16px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
  border-radius: 12px;
  z-index: 3;
  margin-top: -${TOP_ROW_HEIGHT}px;
`;

const StyledDraggableNode = styled.div`
  &:not(:hover) svg path {
    stop-color: currentcolor;
    fill: currentcolor;
  }

  &:hover {
    svg {
      stop:first-of-type {
        stop-color: #dd2476 !important;
      }
      stop:last-child {
        stop-color: #ff512f !important;
      }
    }
    [data-blue-gradient-svg] {
      stop:first-of-type {
        stop-color: #4c6dd4 !important;
      }
      stop:last-child {
        stop-color: #66d9e8 !important;
      }
    }
  }
`;
