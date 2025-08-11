import { Injectable } from '@nestjs/common';
import { PinoLogger, TraceLogRepository } from '@novu/application-generic';
import { TotalInteractionsDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildTotalInteractionsChartCommand } from './build-total-interactions-chart.command';

@Injectable()
export class BuildTotalInteractionsChart {
  constructor(
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildTotalInteractionsChart.name);
  }

  async execute(command: BuildTotalInteractionsChartCommand): Promise<TotalInteractionsDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    // Calculate previous period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1); // Day before start date
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.traceLogRepository.getTotalInteractionsData(
      environmentId,
      organizationId,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate
    );

    return {
      currentPeriod: result.currentPeriod,
      previousPeriod: result.previousPeriod,
    };
  }
}
