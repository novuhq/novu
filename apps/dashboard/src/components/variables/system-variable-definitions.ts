import { IEnvironment } from '@novu/shared';

export type SystemVariableDefinition = {
  key: string;
  resolve: (env: IEnvironment) => string;
};

export const SYSTEM_VARIABLE_DEFINITIONS: SystemVariableDefinition[] = [
  { key: 'environment.name', resolve: (env) => env.name },
  { key: 'environment.type', resolve: (env) => env.type },
];
