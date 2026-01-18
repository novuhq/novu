import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  TraceLogRepository,
  TraceRollupRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InteractionTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildInteractionTrendChartCommand } from './build-interaction-trend-chart.command';

@Injectable()
export class BuildInteractionTrendChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildInteractionTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildInteractionTrendChartCommand): Promise<InteractionTrendDataPointDto[]> {
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
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_INTERACTION_TREND_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const traces = useNewQuery
      ? await this.traceRollupRepository.getInteractionTrendData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        )
      : await this.traceLogRepository.getInteractionTrendData(
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
          ['message_seen', 0],
          ['message_read', 0],
          ['message_snoozed', 0],
          ['message_archived', 0],
        ])
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const trace of traces) {
      const date = trace.date;
      const eventType = trace.event_type;

      const eventMap = chartDataMap.get(date);
      if (eventMap?.has(eventType)) {
        const currentCount = eventMap.get(eventType) || 0;
        eventMap.set(eventType, currentCount + parseInt(trace.count, 10));
      }
    }

    const chartData: InteractionTrendDataPointDto[] = [];

    for (const [date, eventCounts] of chartDataMap) {
      chartData.push({
        timestamp: date,
        messageSeen: eventCounts.get('message_seen') || 0,
        messageRead: eventCounts.get('message_read') || 0,
        messageSnoozed: eventCounts.get('message_snoozed') || 0,
        messageArchived: eventCounts.get('message_archived') || 0,
      });
    }

    return chartData;
  }
}
