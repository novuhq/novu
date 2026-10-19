import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  WorkflowRunCountRepository,
  WorkflowRunRepository,
} from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { WorkflowVolumeDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowByVolumeChartCommand } from './build-workflow-by-volume-chart.command';

@Injectable()
export class BuildWorkflowByVolumeChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private workflowRunCountRepository: WorkflowRunCountRepository,
    private featureFlagsService: FeatureFlagsService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowByVolumeChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowByVolumeChartCommand): Promise<WorkflowVolumeDataPointDto[]> {
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
  ): Promise<WorkflowVolumeDataPointDto[]> {
    const workflowVolumes = await this.workflowRunCountRepository.getWorkflowVolumeData(
      environmentId,
      organizationId,
      startDate,
      endDate
    );

    if (workflowVolumes.length === 0) {
      return [];
    }

    const triggerIdentifiers = workflowVolumes.map((row) => row.workflow_run_id);

    const templates = await this.notificationTemplateRepository.findByTriggerIdentifierBulk(
      environmentId,
      triggerIdentifiers,
      { select: ['name', 'triggers'] }
    );

    const nameByIdentifier = new Map<string, string>();
    for (const template of templates) {
      const identifier = template.triggers?.[0]?.identifier;
      if (identifier) {
        nameByIdentifier.set(identifier, template.name);
      }
    }

    return workflowVolumes.map((row) => ({
      workflowName: nameByIdentifier.get(row.workflow_run_id) ?? row.workflow_run_id,
      count: parseInt(row.count, 10),
    }));
  }

  private async buildChartFromWorkflowRuns(
    startDate: Date,
    endDate: Date,
    environmentId: string,
    organizationId: string,
    workflowIds?: string[]
  ): Promise<WorkflowVolumeDataPointDto[]> {
    const workflowRuns = await this.workflowRunRepository.getWorkflowVolumeData(
      environmentId,
      organizationId,
      startDate,
      endDate,
      workflowIds
    );

    return workflowRuns.map((workflowRun) => ({
      workflowName: workflowRun.workflow_name,
      count: parseInt(workflowRun.count, 10),
    }));
  }
}
