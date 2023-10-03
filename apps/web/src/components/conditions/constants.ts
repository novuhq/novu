import { PreviousStepTypeEnum, TimeOperatorEnum } from '@novu/shared';

export const DefaultTimeOperatorData = [
  { value: TimeOperatorEnum.MINUTES, label: 'Minutes' },
  { value: TimeOperatorEnum.HOURS, label: 'Hours' },
  { value: TimeOperatorEnum.DAYS, label: 'Days' },
];

export const DefaultOperatorData = [
  { value: 'EQUAL', label: 'Equal' },
  { value: 'NOT_EQUAL', label: 'Not equal' },
  { value: 'IN', label: 'Contains' },
  { value: 'NOT_IN', label: 'Does not contain' },
  { value: 'IS_DEFINED', label: 'Is defined' },
  { value: 'LARGER', label: 'Greater than' },
  { value: 'SMALLER', label: 'Less than' },
  { value: 'LARGER_EQUAL', label: 'Greater or Equal' },
  { value: 'SMALLER_EQUAL', label: 'Less or Equal' },
];

export const DefaultGroupOperatorData = [
  { value: 'AND', label: 'And' },
  { value: 'OR', label: 'Or' },
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
