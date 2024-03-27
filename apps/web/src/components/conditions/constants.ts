import { FieldLogicalOperatorEnum, PreviousStepTypeEnum, TimeOperatorEnum, FieldOperatorEnum } from '@novu/shared';

export const DefaultTimeOperatorData = [
  { value: TimeOperatorEnum.MINUTES, label: 'Minutes' },
  { value: TimeOperatorEnum.HOURS, label: 'Hours' },
  { value: TimeOperatorEnum.DAYS, label: 'Days' },
];

export const DefaultOperatorData = [
  { value: FieldOperatorEnum.EQUAL, label: 'Equal' },
  { value: FieldOperatorEnum.NOT_EQUAL, label: 'Not equal' },
  { value: FieldOperatorEnum.IN, label: 'Contains' },
  { value: FieldOperatorEnum.NOT_IN, label: 'Does not contain' },
  { value: FieldOperatorEnum.IS_DEFINED, label: 'Is defined' },
  { value: FieldOperatorEnum.LARGER, label: 'Greater than' },
  { value: FieldOperatorEnum.SMALLER, label: 'Less than' },
  { value: FieldOperatorEnum.LARGER_EQUAL, label: 'Greater or Equal' },
  { value: FieldOperatorEnum.SMALLER_EQUAL, label: 'Less or Equal' },
];

export const DefaultGroupOperatorData = [
  { value: FieldLogicalOperatorEnum.AND, label: 'And' },
  { value: FieldLogicalOperatorEnum.OR, label: 'Or' },
];

export const DefaultPreviousStepTypeData = [
  {
    label: 'Read',
    value: PreviousStepTypeEnum.READ,
  },
  {
    label: 'Unread',
    value: PreviousStepTypeEnum.UNREAD,
  },
  {
    label: 'Seen',
    value: PreviousStepTypeEnum.SEEN,
  },
  {
    label: 'Unseen',
    value: PreviousStepTypeEnum.UNSEEN,
  },
];
