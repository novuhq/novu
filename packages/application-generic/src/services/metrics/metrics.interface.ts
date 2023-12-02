export interface IMetricsService {
  recordMetric(name: string, value: number): Promise<void>;
}
