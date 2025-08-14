import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, StepRunRepository } from '@novu/application-generic';
import { ChartDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildDeliveryTrendChartCommand } from './build-delivery-trend-chart.command';

@Injectable()
export class BuildDeliveryTrendChart {
  constructor(
    private stepRunRepository: StepRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildDeliveryTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildDeliveryTrendChartCommand): Promise<ChartDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate } = command;

    const stepRuns = await this.stepRunRepository.getDeliveryTrendData(
      environmentId,
      organizationId,
      startDate,
      endDate
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
