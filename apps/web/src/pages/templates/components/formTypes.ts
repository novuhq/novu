import type {
  DigestUnitEnum,
  IMessageTemplate,
  IPreferenceChannels,
  BuilderFieldType,
  BuilderGroupValues,
  FilterParts,
} from '@novu/shared';
import { DigestTypeEnum } from '@novu/shared';

export interface ITemplates extends IMessageTemplate {
  htmlContent?: string;
  enableAvatar?: boolean;
  feedId?: string;
  layoutId?: string;
}

export interface IStepEntity {
  id?: string;
  _id?: string;
  name?: string;
  uuid?: string;
  _templateId?: string;
  template: ITemplates;
  filters?: {
    isNegated?: boolean;
    type?: BuilderFieldType;
    value?: BuilderGroupValues;
    children?: FilterParts[];
  }[];
  active: boolean;
  shouldStopOnFail: boolean;
  replyCallback?: {
    active: boolean;
    url?: string;
  };
  metadata?: {
    amount?: number;
    unit?: DigestUnitEnum;
    type?: DigestTypeEnum;
    digestKey?: string;
    delayPath?: string;
  };
}

export interface IForm {
  notificationGroupId: string;
  name: string;
  description: string;
  identifier: string;
  tags: string[];
  critical: boolean;
  steps: IStepEntity[];
  preferenceSettings: IPreferenceChannels;
}
