import { Injectable } from '@nestjs/common';
import {
  DeliveryTrendCountsRepository,
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  StepRunRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ChartDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildDeliveryTrendChartCommand } from './build-delivery-trend-chart.command';

@Injectable()
export class BuildDeliveryTrendChart {
  constructor(
    private deliveryTrendCountsRepository: DeliveryTrendCountsRepository,
    private stepRunRepository: StepRunRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildDeliveryTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildDeliveryTrendChartCommand): Promise<ChartDataPointDto[]> {
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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_DELIVERY_TREND_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const stepRuns = useNewQuery
      ? await this.deliveryTrendCountsRepository.getDeliveryTrendData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        )
      : await this.stepRunRepository.getDeliveryTrendData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        );

    const chartDataMap = new Map<string, Map<string, number>>();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      chartDataMap.set(
        dateKey,
        new Map([
          ['in_app', 0],
          ['email', 0],
          ['sms', 0],
          ['chat', 0],
          ['push', 0],
        ])
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const stepRun of stepRuns) {
      const date = stepRun.date;
      const channel = stepRun.step_type;

      const channelMap = chartDataMap.get(date);
      if (channelMap?.has(channel)) {
        const currentCount = channelMap.get(channel) || 0;
        channelMap.set(channel, currentCount + parseInt(stepRun.count, 10));
      }
    }

    const chartData: ChartDataPointDto[] = [];

    for (const [date, channelCounts] of chartDataMap) {
      chartData.push({
        timestamp: date,
        inApp: channelCounts.get('in_app') || 0,
        email: channelCounts.get('email') || 0,
        sms: channelCounts.get('sms') || 0,
        chat: channelCounts.get('chat') || 0,
        push: channelCounts.get('push') || 0,
      });
    }

    return chartData;
  }
}
