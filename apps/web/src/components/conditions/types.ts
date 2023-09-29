import { BuilderFieldType, BuilderGroupValues, FilterParts, FilterPartTypeEnum } from '@novu/shared';

export interface IConditions {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value?: BuilderGroupValues;
  children?: FilterParts[];
}

export enum ConditionsContextEnum {
  INTEGRATIONS = 'INTEGRATIONS',
}

export const ConditionsContextFields = {
  [ConditionsContextEnum.INTEGRATIONS]: {
    label: 'provider instance',
    filterPartsList: [FilterPartTypeEnum.TENANT],
  },
};
