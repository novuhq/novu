export interface IMetricsService {
  recordMetric(name: string, value: number): Promise<void>;
  isActive(env: Record<string, string>): boolean;
}
