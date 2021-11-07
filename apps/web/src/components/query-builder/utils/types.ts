import { BuilderFieldOperator } from '@notifire/shared';

export const isBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean';
};

export const isString = (value: any): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: any): value is number => {
  return typeof value === 'number';
};

export const isUndefined = (value: any): value is undefined => {
  return typeof value === 'undefined';
};

export const isArray = (value: any): value is any[] => {
  return Array.isArray(value);
};

export const isStringArray = (value: any): value is string[] => {
  return isArray(value) && value.every((item: any) => isString(item));
};

export const isOptionList = (value: any): value is Array<{ value: string; label: string }> => {
  return isArray(value) && value.every((item: any) => isString(item.value) && isString(item.label));
};

export const isOperator = (value: any): value is BuilderFieldOperator => {
  return !!value;
};
