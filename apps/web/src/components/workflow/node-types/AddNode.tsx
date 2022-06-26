import React, { memo } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useStore } from 'react-flow-renderer';
import { Dropdown } from '../../../design-system';
import { ActionIcon, MenuItem as DropdownItem } from '@mantine/core';
import { PlusCircleOutlined } from '../../../design-system/icons';
import { uuid4 } from '.pnpm/@sentry+utils@6.19.3/node_modules/@sentry/utils';
import { getChannel } from '../../../pages/templates/shared/channels';
import { ChannelTypeEnum } from '@novu/shared';

const nodesLengthSelector = (state) => state.nodes?.length || 0;

export default memo(({ selected, id }: { selected: boolean; id: string }) => {
  const nodesLength = useStore(nodesLengthSelector);
  const { addNodes, addEdges } = useReactFlow();

  const addNewNode = (type) => {
    const channel = getChannel(type);

    if (!channel) {
      return;
    }
    const newId = uuid4();
    const newNode = {
      id: newId,
      type: 'channelNode',
      position: { x: 0, y: 120 },
      parentNode: id,
      data: {
        ...channel,
        index: nodesLength + 1,
        active: true,
      },
    };

    addNodes(newNode);

    const newEdge = {
      id: `e-${id}-${newId}`,
      source: id,
      sourceHandle: 'a',
      targetHandle: 'b',
      target: newId,
      curvature: 7,
    };

    addEdges(newEdge);
  };

  return (
    <div data-test-id={`node-addNodeSelector`} style={{ pointerEvents: 'none' }}>
      <Dropdown
        control={
          <ActionIcon
            onClick={() => (selected = false)}
            sx={{ zIndex: 9999, pointerEvents: 'all' }}
            variant="transparent"
          >
            <PlusCircleOutlined />
          </ActionIcon>
        }
      >
        <DropdownItem onClick={() => addNewNode(ChannelTypeEnum.SMS)}>SMS</DropdownItem>
        <DropdownItem>Email</DropdownItem>
        <DropdownItem>In-App</DropdownItem>
      </Dropdown>
    </div>
  );
});
