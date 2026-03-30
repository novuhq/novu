/**
 * The environment system variables automatically injected into every workflow execution.
 * These are read-only variables derived from the Novu environment the workflow runs in.
 */
export type EnvironmentSystemVariables = {
  /** The name of the environment (e.g. "Development", "Production"). */
  name: string;
  /** The type of the environment (e.g. "dev", "prod"). */
  type: 'dev' | 'prod';
};
