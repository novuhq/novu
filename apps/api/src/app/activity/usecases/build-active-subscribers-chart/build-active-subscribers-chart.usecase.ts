import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, WorkflowRunRepository } from '@novu/application-generic';
import { ActiveSubscribersDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildActiveSubscribersChartCommand } from './build-active-subscribers-chart.command';

@Injectable()
export class BuildActiveSubscribersChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildActiveSubscribersChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildActiveSubscribersChartCommand): Promise<ActiveSubscribersDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    // Calculate previous period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.workflowRunRepository.getActiveSubscribersData(
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
