import { EnvironmentSystemVariables, IEnvironment } from '@novu/shared';

export type SystemVariableDefinition = {
  /** Typed as a template literal to catch drift when new fields are added to EnvironmentSystemVariables. */
  key: `env.${keyof EnvironmentSystemVariables}`;
  resolve: (env: IEnvironment) => string;
};

export const SYSTEM_VARIABLE_DEFINITIONS: SystemVariableDefinition[] = [
  { key: 'env.name', resolve: (env) => env.name },
  { key: 'env.type', resolve: (env) => env.type },
];
