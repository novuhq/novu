import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, WorkflowRunRepository } from '@novu/application-generic';
import { ActiveSubscribersTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildActiveSubscribersTrendChartCommand } from './build-active-subscribers-trend-chart.command';

@Injectable()
export class BuildActiveSubscribersTrendChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildActiveSubscribersTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildActiveSubscribersTrendChartCommand): Promise<ActiveSubscribersTrendDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate } = command;

    const activeSubscribers = await this.workflowRunRepository.getActiveSubscribersTrendData(
      environmentId,
      organizationId,
      startDate,
      endDate
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
