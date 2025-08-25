import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ActivityController } from './activity.controller';
import { BuildActiveSubscribersChart } from './usecases/build-active-subscribers-chart/build-active-subscribers-chart.usecase';
import { BuildActiveSubscribersTrendChart } from './usecases/build-active-subscribers-trend-chart/build-active-subscribers-trend-chart.usecase';
import { BuildAvgMessagesPerSubscriberChart } from './usecases/build-avg-messages-per-subscriber-chart/build-avg-messages-per-subscriber-chart.usecase';
import { BuildDeliveryTrendChart } from './usecases/build-delivery-trend-chart/build-delivery-trend-chart.usecase';
import { BuildInteractionTrendChart } from './usecases/build-interaction-trend-chart/build-interaction-trend-chart.usecase';
import { BuildMessagesDeliveredChart } from './usecases/build-messages-delivered-chart/build-messages-delivered-chart.usecase';
import { BuildProviderByVolumeChart } from './usecases/build-provider-by-volume-chart/build-provider-by-volume-chart.usecase';
import { BuildTotalInteractionsChart } from './usecases/build-total-interactions-chart/build-total-interactions-chart.usecase';
import { BuildWorkflowByVolumeChart } from './usecases/build-workflow-by-volume-chart/build-workflow-by-volume-chart.usecase';
import { BuildWorkflowRunsCountChart } from './usecases/build-workflow-runs-count-chart/build-workflow-runs-count-chart.usecase';
import { BuildWorkflowRunsMetricChart } from './usecases/build-workflow-runs-metric-chart/build-workflow-runs-metric-chart.usecase';
import { BuildWorkflowRunsTrendChart } from './usecases/build-workflow-runs-trend-chart/build-workflow-runs-trend-chart.usecase';
import { GetCharts } from './usecases/get-charts/get-charts.usecase';
import { GetRequest } from './usecases/get-request/get-request.usecase';
import { GetRequests } from './usecases/get-requests/get-requests.usecase';
import { GetWorkflowRun } from './usecases/get-workflow-run/get-workflow-run.usecase';
import { GetWorkflowRuns } from './usecases/get-workflow-runs/get-workflow-runs.usecase';
import { WorkflowRunService } from '@novu/application-generic';

const USE_CASES = [
  GetRequests,
  GetWorkflowRuns,
  GetWorkflowRun,
  GetCharts,
  BuildDeliveryTrendChart,
  BuildInteractionTrendChart,
  BuildWorkflowByVolumeChart,
  BuildProviderByVolumeChart,
  BuildMessagesDeliveredChart,
  BuildActiveSubscribersChart,
  BuildActiveSubscribersTrendChart,
  BuildAvgMessagesPerSubscriberChart,
  BuildWorkflowRunsCountChart,
  BuildWorkflowRunsMetricChart,
  BuildTotalInteractionsChart,
  BuildWorkflowRunsTrendChart,
  GetRequest,
  WorkflowRunService,
];

@Module({
  imports: [SharedModule],
  controllers: [ActivityController],
  providers: [...USE_CASES],
})
export class ActivityModule {}
