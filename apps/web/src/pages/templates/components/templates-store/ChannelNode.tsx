import { NodeProps, Handle, Position, getOutgoers, useReactFlow } from 'react-flow-renderer';

import { NodeStep } from '../../../../components/workflow';

export const ChannelNode = ({ id, data }: NodeProps) => {
  const { getNode, getEdges, getNodes } = useReactFlow();
  const thisNode = getNode(id);
  const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };

  return (
    <NodeStep
      data={data}
      Icon={data.Icon}
      Handlers={() => {
        return (
          <>
            <Handle type="target" position={Position.Top} />
            <Handle style={noChildStyle} type="source" position={Position.Bottom} />
          </>
        );
      }}
    />
  );
};
