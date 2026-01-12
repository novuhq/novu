import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  WorkflowRunRepository,
  WorkflowVolumeCountsRepository,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { WorkflowVolumeDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowByVolumeChartCommand } from './build-workflow-by-volume-chart.command';

@Injectable()
export class BuildWorkflowByVolumeChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private workflowVolumeCountsRepository: WorkflowVolumeCountsRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowByVolumeChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowByVolumeChartCommand): Promise<WorkflowVolumeDataPointDto[]> {
    const { environmentId, organizationId, startDate, endDate, workflowIds } = command;

    const featureFlagContext = {
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    };

    const [isGlobalEnabled, isDedicatedEnabled] = await Promise.all([
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_ANALYTIC_V2_LOGS_READ_GLOBAL_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
      this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_V2_WORKFLOW_VOLUME_READ_ENABLED,
        defaultValue: false,
        ...featureFlagContext,
      }),
    ]);

    const useNewQuery = isGlobalEnabled || isDedicatedEnabled;

    const workflowRuns = useNewQuery
      ? await this.workflowVolumeCountsRepository.getWorkflowVolumeData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        )
      : await this.workflowRunRepository.getWorkflowVolumeData(
          environmentId,
          organizationId,
          startDate,
          endDate,
          workflowIds
        );

    const chartData: WorkflowVolumeDataPointDto[] = workflowRuns.map((workflowRun) => ({
      workflowName: workflowRun.workflow_name,
      count: parseInt(workflowRun.count, 10),
    }));

    return chartData;
  }
}
