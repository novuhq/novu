import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  WorkflowRunCountRepository,
  WorkflowRunRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { WorkflowRunsTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowRunsTrendChartCommand } from './build-workflow-runs-trend-chart.command';

@Injectable()
export class BuildWorkflowRunsTrendChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private workflowRunCountRepository: WorkflowRunCountRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsTrendChartCommand): Promise<WorkflowRunsTrendDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const isWorkflowRunCountEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_COUNT_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });

    if (isWorkflowRunCountEnabled) {
      return this.buildChartFromWorkflowRunCount(startDate, endDate, environmentId, organizationId);
    }

    return this.buildChartFromWorkflowRuns(startDate, endDate, environmentId, organizationId, workflowIds);
  }

  private async buildChartFromWorkflowRunCount(
    startDate: Date,
    endDate: Date,
    environmentId: string,
    organizationId: string
  ): Promise<WorkflowRunsTrendDataPointDto[]> {
    const workflowRuns = await this.workflowRunCountRepository.getWorkflowRunsTrendData(
      environmentId,
      organizationId,
      startDate,
      endDate
    );

    const dataByDate = new Map<string, WorkflowRunsTrendDataPointDto>();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dataByDate.set(dateKey, {
        timestamp: dateKey,
        processing: 0,
        completed: 0,
        error: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const workflowRun of workflowRuns) {
      const existingDataPoint = dataByDate.get(workflowRun.date);
      if (existingDataPoint) {
        const count = parseInt(workflowRun.count, 10);
        const updatedDataPoint = { ...existingDataPoint };

        switch (workflowRun.event_type) {
          case 'workflow_run_status_processing':
            updatedDataPoint.processing += count;
            break;
          case 'workflow_run_status_completed':
            updatedDataPoint.completed += count;
            break;
          case 'workflow_run_status_error':
            updatedDataPoint.error += count;
            break;
        }

        dataByDate.set(workflowRun.date, updatedDataPoint);
      }
    }

    return Array.from(dataByDate.values());
  }

  private async buildChartFromWorkflowRuns(
    startDate: Date,
    endDate: Date,
    environmentId: string,
    organizationId: string,
    workflowIds?: string[]
  ): Promise<WorkflowRunsTrendDataPointDto[]> {
    const workflowRuns = await this.workflowRunRepository.getWorkflowRunsTrendData(
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
          ['pending', 0], // remove backward compatibility after data renews nv-6562
          ['processing', 0],
          ['success', 0], // remove backward compatibility after data renews nv-6562
          ['completed', 0],
          ['error', 0],
        ])
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const workflowRun of workflowRuns) {
      const date = workflowRun.date;
      const status = workflowRun.status;

      const statusMap = chartDataMap.get(date);
      if (statusMap?.has(status)) {
        const currentCount = statusMap.get(status) || 0;
        statusMap.set(status, currentCount + parseInt(workflowRun.count, 10));
      }
    }

    const chartData: WorkflowRunsTrendDataPointDto[] = [];

    for (const [date, statusCounts] of chartDataMap) {
      chartData.push({
        timestamp: date,
        processing: (statusCounts.get('pending') || 0) + (statusCounts.get('processing') || 0), // remove backward compatibility after data renews nv-6562
        completed: (statusCounts.get('success') || 0) + (statusCounts.get('completed') || 0), // remove backward compatibility after data renews nv-6562
        error: statusCounts.get('error') || 0,
      });
    }

    return chartData;
  }
}
