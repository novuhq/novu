import type { MouseEvent } from 'react';
import { EdgeProps, NodeProps } from 'react-flow-renderer';
import { ChannelTypeEnum, IEmailBlock, StepTypeEnum } from '@novu/shared';

import type { IFormStep } from '../../pages/templates/components/formTypes';

export interface IEdge extends EdgeProps {
  parentId: string;
  childId?: string;
  addNewNode: (parentNodeId: string, channelType: string, childId?: string) => void;
}

export interface IFlowStep {
  id?: string;
  _id?: string;
  name?: string;
  stepId?: string;
  uuid?: string;
  active?: boolean;
  template?: {
    type: StepTypeEnum;
    content?: string | IEmailBlock[];
    htmlContent?: string;
  };
  variants?: Omit<IFlowStep, 'variants'>[];
  filters?: IFormStep['filters'];
  digestMetadata?: IFormStep['digestMetadata'];
  delayMetadata?: IFormStep['delayMetadata'];
}

export interface NodeData {
  isReadonly: boolean;
  Icon: React.FC<any>;
  label: string;
  tabKey: ChannelTypeEnum;
  index: number;
  testId: string;
  onDelete: (uuid: string) => void;
  onAddVariant: (uuid: string) => void;
  onEdit: (e: MouseEvent<HTMLButtonElement>, node: INode) => void;
  error: string;
  channelType: StepTypeEnum;
  step?: IFlowStep;
}

export enum NodeType {
  CHANNEL = 'channelNode',
  TRIGGER = 'triggerNode',
  ADD_NODE = 'addNode',
}

export type INode = NodeProps<NodeData>;
