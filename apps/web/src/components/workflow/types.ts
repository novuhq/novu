import { EdgeProps } from 'react-flow-renderer';
import { IEmailBlock, StepTypeEnum } from '@novu/shared';
import { IFormStep } from '../../pages/templates/components/formTypes';

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
  template?: {
    type: StepTypeEnum;
    content?: string | IEmailBlock[];
    htmlContent?: string;
  };
  digestMetadata?: IFormStep['digestMetadata'];
  delayMetadata?: IFormStep['delayMetadata'];
}
