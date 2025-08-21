import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, WorkflowRunRepository } from '@novu/application-generic';
import { WorkflowRunsTrendDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowRunsTrendChartCommand } from './build-workflow-runs-trend-chart.command';

@Injectable()
export class BuildWorkflowRunsTrendChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsTrendChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsTrendChartCommand): Promise<WorkflowRunsTrendDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate } = command;

    const workflowRuns = await this.workflowRunRepository.getWorkflowRunsTrendData(
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
