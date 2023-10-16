import { Control } from 'react-hook-form';
import { BuilderFieldType, BuilderGroupValues, FilterParts, FilterPartTypeEnum } from '@novu/shared';

export interface IConditions {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value?: BuilderGroupValues;
  children?: FilterParts[];
}
export interface IConditionsForm {
  conditions: IConditions[];
}

export interface IConditionsProps {
  control: Control<IConditionsForm>;
  isReadonly?: boolean;
  index: number;
}
export type DataSelect = { value: string; label: string };

export interface IFilterTypeList {
  value: FilterPartTypeEnum;
  label: string;
  data?: DataSelect[];
}
