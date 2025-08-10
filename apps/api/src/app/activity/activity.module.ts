import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ActivityController } from './activity.controller';
import { BuildActiveSubscribersChart } from './usecases/build-active-subscribers-chart/build-active-subscribers-chart.usecase';
import { BuildAvgMessagesPerSubscriberChart } from './usecases/build-avg-messages-per-subscriber-chart/build-avg-messages-per-subscriber-chart.usecase';
import { BuildDeliveryTrendChart } from './usecases/build-delivery-trend-chart/build-delivery-trend-chart.usecase';
import { BuildMessagesDeliveredChart } from './usecases/build-messages-delivered-chart/build-messages-delivered-chart.usecase';
import { BuildWorkflowByVolumeChart } from './usecases/build-workflow-by-volume-chart/build-workflow-by-volume-chart.usecase';
import { BuildWorkflowRunsMetricChart } from './usecases/build-workflow-runs-metric-chart/build-workflow-runs-metric-chart.usecase';
import { GetCharts } from './usecases/get-charts/get-charts.usecase';
import { GetRequest } from './usecases/get-request/get-request.usecase';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetWorkflowRun } from './usecases/get-workflow-run/get-workflow-run.usecase';
import { GetWorkflowRuns } from './usecases/get-workflow-runs/get-workflow-runs.usecase';

const USE_CASES = [
  GetRequests,
  GetWorkflowRuns,
  GetWorkflowRun,
  GetCharts,
  BuildDeliveryTrendChart,
  BuildWorkflowByVolumeChart,
  BuildMessagesDeliveredChart,
  BuildActiveSubscribersChart,
  BuildAvgMessagesPerSubscriberChart,
  BuildWorkflowRunsMetricChart,
  GetRequest,
];

@Module({
  imports: [SharedModule],
  controllers: [ActivityController],
  providers: [...USE_CASES],
})
export class ActivityModule {}
