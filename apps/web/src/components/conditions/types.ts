import { BuilderFieldType, BuilderGroupValues, FilterParts, FilterPartTypeEnum } from '@novu/shared';

export interface IConditions {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value?: BuilderGroupValues;
  children?: FilterParts[];
}

export enum ConditionsContextEnum {
  INTEGRATIONS = 'INTEGRATIONS',
  WORKFLOW = 'WORKFLOW',
}

export const ConditionsContextFields = {
  [ConditionsContextEnum.INTEGRATIONS]: {
    label: 'provider instance',
    filterPartsList: [FilterPartTypeEnum.TENANT],
    defaultFilter: FilterPartTypeEnum.TENANT,
  },
  [ConditionsContextEnum.WORKFLOW]: {
    label: '',
    filterPartsList: [
      FilterPartTypeEnum.TENANT,
      FilterPartTypeEnum.PAYLOAD,
      FilterPartTypeEnum.SUBSCRIBER,
      FilterPartTypeEnum.WEBHOOK,
      FilterPartTypeEnum.IS_ONLINE,
      FilterPartTypeEnum.IS_ONLINE_IN_LAST,
      FilterPartTypeEnum.PREVIOUS_STEP,
    ],
    defaultFilter: FilterPartTypeEnum.PAYLOAD,
  },
};
