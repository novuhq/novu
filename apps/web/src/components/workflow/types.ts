import { EdgeProps } from 'react-flow-renderer';
import { StepTypeEnum } from '@novu/shared';

export interface IEdge extends EdgeProps {
  parentId: string;
  childId?: string;
  addNewNode: (parentNodeId: string, channelType: string, childId?: string) => void;
}

export interface IFlowStep {
  id?: string;
  _id?: string;
  name?: string;
  uuid?: string;
  active?: boolean;
  template: {
    type: StepTypeEnum;
  };
}
