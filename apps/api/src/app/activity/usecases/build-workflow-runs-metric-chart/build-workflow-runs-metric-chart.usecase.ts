import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, WorkflowRunRepository } from '@novu/application-generic';
import { WorkflowRunsMetricDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowRunsMetricChartCommand } from './build-workflow-runs-metric-chart.command';

@Injectable()
export class BuildWorkflowRunsMetricChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsMetricChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsMetricChartCommand): Promise<WorkflowRunsMetricDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    // Calculate previous period dates
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousEndDate = new Date(startDate.getTime() - 1); // Day before start date
    const previousStartDate = new Date(previousEndDate.getTime() - periodDuration);

    const result = await this.workflowRunRepository.getWorkflowRunsMetricData(
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
