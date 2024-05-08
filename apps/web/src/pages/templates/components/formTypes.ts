import type {
  DigestUnitEnum,
  IMessageTemplate,
  IPreferenceChannels,
  BuilderFieldType,
  BuilderGroupValues,
  FilterParts,
  DaysEnum,
  DelayTypeEnum,
  MonthlyTypeEnum,
  OrdinalEnum,
  OrdinalValueEnum,
} from '@novu/shared';
import { DigestTypeEnum } from '@novu/shared';

export interface ITemplates extends IMessageTemplate {
  htmlContent?: string;
  enableAvatar?: boolean;
  feedId?: string;
  layoutId?: string;
}

export type IVariantStep = Omit<IFormStep, 'variants'>;

export interface IFormStep {
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
  active?: boolean;
  shouldStopOnFail?: boolean;
  replyCallback?: {
    active: boolean;
    url?: string;
  };
  variants?: IVariantStep[];
  digestMetadata?: {
    type: DigestTypeEnum;
    digestKey?: string;
    [DigestTypeEnum.REGULAR]?: {
      amount: string;
      unit: DigestUnitEnum;
      backoff?: boolean;
      backoffAmount?: string;
      backoffUnit?: DigestUnitEnum;
    };
    [DigestTypeEnum.TIMED]?: {
      unit: DigestUnitEnum;
      [DigestUnitEnum.MINUTES]?: {
        amount: string;
      };
      [DigestUnitEnum.HOURS]?: {
        amount: string;
      };
      [DigestUnitEnum.DAYS]?: {
        amount: string;
        atTime: string;
      };
      [DigestUnitEnum.WEEKS]?: {
        amount: string;
        atTime: string;
        weekDays: DaysEnum[];
      };
      [DigestUnitEnum.MONTHS]?: {
        amount: string;
        atTime: string;
        monthDays: number[];
        monthlyType: MonthlyTypeEnum;
        ordinal?: OrdinalEnum;
        ordinalValue?: OrdinalValueEnum;
      };
    };
  };
  delayMetadata?: {
    type: DelayTypeEnum;
    [DelayTypeEnum.REGULAR]?: {
      amount: string;
      unit: DigestUnitEnum;
    };
    [DelayTypeEnum.SCHEDULED]?: {
      delayPath: string;
    };
  };
}

export interface IForm {
  notificationGroupId: string;
  name: string;
  description: string;
  identifier: string;
  tags: string[];
  critical: boolean;
  steps: IFormStep[];
  preferenceSettings: IPreferenceChannels;
  payloadSchema?: any;
}
