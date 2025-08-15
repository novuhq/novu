import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, WorkflowRunRepository } from '@novu/application-generic';
import { WorkflowVolumeDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowByVolumeChartCommand } from './build-workflow-by-volume-chart.command';

@Injectable()
export class BuildWorkflowByVolumeChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowByVolumeChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowByVolumeChartCommand): Promise<WorkflowVolumeDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate } = command;

    const workflowRuns = await this.workflowRunRepository.getWorkflowVolumeData(
      environmentId,
      organizationId,
      startDate,
      endDate
    );

    const chartData: WorkflowVolumeDataPointDto[] = workflowRuns.map((workflowRun) => ({
      workflowName: workflowRun.workflow_name,
      count: parseInt(workflowRun.count, 10),
    }));

    return chartData;
  }
}
