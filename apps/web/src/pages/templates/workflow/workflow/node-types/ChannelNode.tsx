import React, { memo, useEffect, useState, useMemo } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useNodes } from 'react-flow-renderer';
import { ChannelTypeEnum, DelayTypeEnum, StepTypeEnum } from '@novu/shared';

import { WorkflowNode } from './WorkflowNode';
import { useParams } from 'react-router-dom';
import { IFormStep, ITemplates } from '../../../components/formTypes';
import { WillBeSentHeader } from '../../digest/WillBeSentHeader';

interface NodeData {
  Icon: React.FC<any>;
  label: string;
  tabKey: ChannelTypeEnum;
  index: number;
  testId: string;
  onDelete: (uuid: string) => void;
  error: string;
  active?: boolean;
  channelType: StepTypeEnum;
  uuid: string;
  name?: string;
  content?: ITemplates['content'];
  htmlContent?: ITemplates['htmlContent'];
  delayMetadata?: IFormStep['delayMetadata'];
  digestMetadata?: IFormStep['digestMetadata'];
}

export default memo(
  ({ data, selected, id, dragging }: { data: NodeData; selected: boolean; id: string; dragging: boolean }) => {
    const { getNode, getEdges, getNodes } = useReactFlow();
    const nodes = useNodes<NodeData>();
    const thisNode = getNode(id);
    const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
    const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
    const [count, setCount] = useState(0);
    const { stepUuid = '' } = useParams<{ stepUuid: string }>();

    useEffect(() => {
      const items = nodes
        .filter((node) => node.type === 'channelNode')
        .filter((node) => {
          return node.data.channelType === data.channelType;
        });

      if (items.length <= 1) {
        setCount(0);

        return;
      }

      const foundIndex = items.findIndex((node) => node.id === id);

      if (foundIndex === -1) {
        setCount(0);

        return;
      }

      setCount(foundIndex + 1);
    }, [nodes.length, data, id]);
    const subtitle = useMemo(() => {
      const content = data.content;
      if (StepTypeEnum.DELAY === data.channelType) {
        return delaySubtitle(data);
      }
      if (StepTypeEnum.DIGEST === data.channelType) {
        return <WillBeSentHeader index={data.index} isHighlight={false} />;
      }

      if (typeof content === 'string') {
        return content;
      }

      if (data.channelType === StepTypeEnum.EMAIL) {
        if (content && content?.length > 0) {
          return content?.find((item) => item.type === 'text')?.content;
        }
        if (data.htmlContent) {
          return data.htmlContent;
        }
      }

      return undefined;
    }, [data]);

    return (
      <div data-test-id={`node-${data.testId}`} style={{ pointerEvents: 'none' }}>
        <WorkflowNode
          errors={data.error}
          onDelete={() => {
            data.onDelete(data.uuid);
          }}
          tabKey={data.tabKey}
          channelType={data.channelType}
          Icon={data.Icon}
          label={data.name ? data.name : data.label + (count > 0 ? ` (${count})` : '')}
          active={stepUuid === data.uuid}
          disabled={!data.active}
          id={id}
          index={data.index}
          testId={'channel-node'}
          dragging={dragging}
          subtitle={subtitle}
        />
        <Handle type="target" id="b" position={Position.Top} />
        <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      </div>
    );
  }
);

function delaySubtitle(data: NodeData) {
  if (data.channelType === StepTypeEnum.DELAY && data.delayMetadata) {
    if (data.delayMetadata.type === DelayTypeEnum.REGULAR) {
      return `Delay all events for ${data.delayMetadata.regular?.amount} ${data.delayMetadata.regular?.unit}`;
    } else {
      return `Delay all events on the basis of ${data.delayMetadata.scheduled?.delayPath} path`;
    }
  }
}
