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
    description: "This environment's display name. In templates, use {{env.name}}.",
  },
  {
    key: 'env.type',
    resolve: (env) => env.type,
    description:
      'Tells Novu if this environment is for editing (dev) or live use (prod).\n\n• Development → dev\n• Production → prod\n• Custom environments (e.g. Staging) → prod\n\nEdit workflows and content in dev only. Prod environments update when you publish.\n\nSet by Novu — not editable. Need your own label? Create a custom variable.',
  },
];
