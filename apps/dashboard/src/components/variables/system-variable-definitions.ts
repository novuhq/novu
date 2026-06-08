import { EnvironmentSystemVariables, IEnvironment } from '@novu/shared';

export type SystemVariableDefinition = {
  /** Typed as a template literal to catch drift when new fields are added to EnvironmentSystemVariables. */
  key: `env.${keyof EnvironmentSystemVariables}`;
  resolve: (env: IEnvironment) => string;
  description: string;
};

export const SYSTEM_VARIABLE_DEFINITIONS: SystemVariableDefinition[] = [
  {
    key: 'env.name',
    resolve: (env) => env.name,
    description:
      'The display name of the environment. Use it in templates as {{env.name}} to reference the current environment by name.',
  },
  {
    key: 'env.type',
    resolve: (env) => env.type,
    description:
      'System classification for the environment: dev or prod.\n\n• Development → dev\n• Production and custom environments (e.g. Staging) → prod\n\nNovu uses this for platform behavior — for example, content can only be edited in dev environments, and prod environments receive updates through publishing. This value is managed by Novu and cannot be changed. Create a custom variable (e.g. environmentType) if you need your own classification.',
  },
];
