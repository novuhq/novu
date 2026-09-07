export * from './getTemplateVariables';
export * from './handlebarHelpers';

export const novuReservedVariableNames = ['body'];

export function isReservedVariableName(variableName: string) {
  return novuReservedVariableNames.includes(variableName);
}
