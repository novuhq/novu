export * from './handlebarHelpers';
export * from './getTemplateVariables';

export const novuReservedVariableNames = ['body'];

export function isReservedVariableName(variableName: string) {
  return novuReservedVariableNames.includes(variableName);
}
