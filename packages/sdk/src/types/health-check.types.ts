export type HealthCheck = {
  status: 'ok' | 'error';
  version: string;
  discovered: {
    workflows: number;
    steps: number;
  };
};
