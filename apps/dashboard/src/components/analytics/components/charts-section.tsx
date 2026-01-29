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
  isTrendsLoading: boolean;
  isWorkflowLoading: boolean;
  trendsError: Error | null;
  workflowError: Error | null;
};

export function ChartsSection({
  charts,
  isTrendsLoading,
  isWorkflowLoading,
  trendsError,
  workflowError,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      <DeliveryTrendsChart
        data={charts?.[ReportTypeEnum.DELIVERY_TREND] as ChartDataPoint[]}
        isLoading={isTrendsLoading}
        error={trendsError}
      />
      <WorkflowsByVolume
        data={charts?.[ReportTypeEnum.WORKFLOW_BY_VOLUME] as WorkflowVolumeDataPoint[]}
        isLoading={isWorkflowLoading}
        error={workflowError}
      />
      <InteractionTrendChart
        data={charts?.[ReportTypeEnum.INTERACTION_TREND] as InteractionTrendDataPoint[]}
        isLoading={isTrendsLoading}
        error={trendsError}
      />
    </div>
  );
}
