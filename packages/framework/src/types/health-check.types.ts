export type HealthCheck = {
  status: 'ok' | 'error';
  sdkVersion: string;
  frameworkVersion: string;
  discovered: {
    workflows: number;
    steps: number;
  };
};
