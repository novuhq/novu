import {
  type ChartDataPoint,
  type InteractionTrendDataPoint,
  ReportTypeEnum,
  type WorkflowVolumeDataPoint,
} from '../../../api/activity';
import { DeliveryTrendsChart } from '../charts/delivery-trends-chart';
import { InteractionTrendChart } from '../charts/interaction-trend-chart';
import { WorkflowsByVolume } from '../charts/workflows-by-volume';

type ChartsSectionProps = {
  charts: Record<string, unknown> | undefined;
  isLoading: boolean;
  error: Error | null;
};

export function ChartsSection({ charts, isLoading, error }: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      <DeliveryTrendsChart
        data={charts?.[ReportTypeEnum.DELIVERY_TREND] as ChartDataPoint[]}
        isLoading={isLoading}
        error={error}
      />
      <WorkflowsByVolume
        data={charts?.[ReportTypeEnum.WORKFLOW_BY_VOLUME] as WorkflowVolumeDataPoint[]}
        isLoading={isLoading}
        error={error}
      />
      <InteractionTrendChart
        data={charts?.[ReportTypeEnum.INTERACTION_TREND] as InteractionTrendDataPoint[]}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
