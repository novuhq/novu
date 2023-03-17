import React, { memo } from 'react';
import { Handle, Position, getOutgoers, useReactFlow } from 'react-flow-renderer';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { WorkflowNode } from './WorkflowNode';
import { useTemplateEditorContext } from '../../../editor/TemplateEditorProvider';

interface NodeData {
  Icon: React.FC<any>;
  description: string;
  label: string;
  tabKey: ChannelTypeEnum;
  channelType: StepTypeEnum;
  index: number;
  testId: string;
  onDelete: (id: string) => void;
  error: string;
  setActivePage: (string) => void;
  active?: boolean;
}

export default memo(({ data, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
  const { getNode, getEdges, getNodes } = useReactFlow();
  const { selectedNodeId } = useTemplateEditorContext();
  const thisNode = getNode(id);
  const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

  return (
    <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
      <WorkflowNode
        setActivePage={data.setActivePage}
        errors={data.error}
        onDelete={data.onDelete}
        tabKey={data.tabKey}
        channelType={data.channelType}
        Icon={data.Icon}
        label={data.label}
        active={id === selectedNodeId}
        disabled={!data.active}
        id={id}
        index={data.index}
        dragging={dragging}
      />
      <Handle type="target" id="b" position={Position.Top} />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
    </div>
  );
});
