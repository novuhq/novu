import React, { memo } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useUpdateNodeInternals } from 'react-flow-renderer';
import { ChannelButton, Dropdown } from '../../../design-system';
import { ActionIcon, MenuItem as DropdownItem } from '@mantine/core';
import { PlusCircleOutlined } from '../../../design-system/icons';
import { When } from '../../utils/When';
import { uuid4 } from '.pnpm/@sentry+utils@6.19.3/node_modules/@sentry/utils';
import { getChannel } from '../../../pages/templates/shared/channels';
import { ChannelTypeEnum } from '@novu/shared';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: string;
  index: number;
  testId: string;
  onDelete: (id: string) => void;
  showDropZone: boolean;
  error: string;
  setActivePage: (string) => void;
  active: boolean;
}

export default memo(
  ({ data, selected, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
    const { getNode, getEdges, getNodes, addNodes, addEdges } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const thisNode = getNode(id);
    const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
    const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

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
          index: data.index + 1,
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
      updateNodeInternals(id);
    };

    return (
      <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
        <ChannelButton
          setActivePage={data.setActivePage}
          showDropZone={data.showDropZone}
          errors={data.error}
          onDelete={data.onDelete}
          tabKey={data.tabKey}
          Icon={data.Icon}
          label={data.label}
          active={selected}
          disabled={!data.active}
          id={id}
          dragging={dragging}
        />
        <When truthy={!isParent}>
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
        </When>
        <Handle type="target" id="b" position={Position.Top} />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    );
  }
);
