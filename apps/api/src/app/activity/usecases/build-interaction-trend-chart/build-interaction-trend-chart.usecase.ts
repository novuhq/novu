import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, TraceRollupRepository } from '@novu/application-generic';
import { InteractionTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildInteractionTrendChartCommand } from './build-interaction-trend-chart.command';

@Injectable()
export class BuildInteractionTrendChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildInteractionTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildInteractionTrendChartCommand): Promise<InteractionTrendDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const traces = await this.traceRollupRepository.getInteractionTrendData(
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
