import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, TraceRollupRepository } from '@novu/application-generic';
import { TotalInteractionsDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildTotalInteractionsChartCommand } from './build-total-interactions-chart.command';

@Injectable()
export class BuildTotalInteractionsChart {
  constructor(
    private traceRollupRepository: TraceRollupRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildTotalInteractionsChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildTotalInteractionsChartCommand): Promise<TotalInteractionsDataPointDto> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.traceRollupRepository.getTotalInteractionsCount(
      environmentId,
      organizationId,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      workflowIds
    );

    return {
      currentPeriod: result.currentPeriod,
      previousPeriod: result.previousPeriod,
    };
  }
}
