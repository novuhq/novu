import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  TraceRollupRepository,
  WorkflowRunRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ActiveSubscribersTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildActiveSubscribersTrendChartCommand } from './build-active-subscribers-trend-chart.command';

@Injectable()
export class BuildActiveSubscribersTrendChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildActiveSubscribersTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildActiveSubscribersTrendChartCommand): Promise<ActiveSubscribersTrendDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const featureFlagContext = {
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    };

    const [isGlobalEnabled, isDedicatedEnabled] = await Promise.all([
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_LOGS_READ_GLOBAL_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_ACTIVE_SUBSCRIBER_TREND_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const activeSubscribers = useNewQuery
      ? await this.traceRollupRepository.getActiveSubscribersTrendData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        )
      : await this.workflowRunRepository.getActiveSubscribersTrendData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        );

    const chartDataMap = new Map<string, number>();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      chartDataMap.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const dataPoint of activeSubscribers) {
      const date = dataPoint.date;
      chartDataMap.set(date, parseInt(dataPoint.count, 10));
    }

    const chartData: ActiveSubscribersTrendDataPointDto[] = [];

    for (const [date, count] of chartDataMap) {
      chartData.push({
        timestamp: date,
        count,
      });
    }

    return chartData;
  }
}
