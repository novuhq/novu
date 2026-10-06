import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  InstrumentUsecase,
  PinoLogger,
  QueryBuilder,
  WorkflowRun,
  WorkflowRunCountRepository,
  WorkflowRunRepository,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { WorkflowRunsCountDataPointDto } from '../../dtos/get-charts.response.dto';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';
import { BuildWorkflowRunsCountChartCommand } from './build-workflow-runs-count-chart.command';

function hasGranularFilters(command: BuildWorkflowRunsCountChartCommand): boolean {
  const { workflowIds, subscriberIds, transactionIds, statuses, channels, topicKey } = command;

  return Boolean(
    workflowIds?.length ||
      subscriberIds?.length ||
      transactionIds?.length ||
      statuses?.length ||
      channels?.length ||
      topicKey
  );
}

@Injectable()
export class BuildWorkflowRunsCountChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private workflowRunCountRepository: WorkflowRunCountRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsCountChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsCountChartCommand): Promise<WorkflowRunsCountDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    /*
     * The pre-aggregated workflow_run_count table is only bucketed by environment, organization and date,
     * so it cannot honor granular filters. Any filtered request must be counted from the raw workflow runs.
     */
    if (hasGranularFilters(command)) {
      return this.buildCountFromWorkflowRuns(command);
    }

    const isWorkflowRunCountEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_COUNT_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });

    if (isWorkflowRunCountEnabled) {
      return this.buildCountFromWorkflowRunCount(startDate, endDate, environmentId, organizationId);
    }

    return this.buildCountFromWorkflowRuns(command);
  }

  private async buildCountFromWorkflowRunCount(
    startDate: Date,
    endDate: Date,
    environmentId: string,
    organizationId: string
  ): Promise<WorkflowRunsCountDataPointDto> {
    const count = await this.workflowRunCountRepository.getTotalRunsCount(
      environmentId,
      organizationId,
      startDate,
      endDate
    );

    return { count };
  }

  private async buildCountFromWorkflowRuns(
    command: BuildWorkflowRunsCountChartCommand
  ): Promise<WorkflowRunsCountDataPointDto> {
    const {
      environmentId,
      startDate,
      endDate,
      workflowIds,
      subscriberIds,
      transactionIds,
      statuses,
      channels,
      topicKey,
    } = command;

    try {
      const queryBuilder = new QueryBuilder<WorkflowRun>({
        environmentId,
      });

      queryBuilder.whereGreaterThanOrEqual('created_at', startDate);
      queryBuilder.whereLessThanOrEqual('created_at', endDate);

      if (workflowIds?.length) {
        queryBuilder.whereIn('workflow_id', workflowIds);
      }

      if (subscriberIds?.length) {
        queryBuilder.whereIn('external_subscriber_id', subscriberIds);
      }

      if (transactionIds?.length) {
        queryBuilder.whereIn('transaction_id', transactionIds);
      }

      if (statuses?.length) {
        const mappedStatuses = statuses.map((status) => {
          //backward compatibility: if new statuses are used, append old status until renewed in the database, nv-6562
          if (status === WorkflowRunStatusDtoEnum.PROCESSING) {
            return [WorkflowRunStatusEnum.PENDING, WorkflowRunStatusEnum.PROCESSING];
          }
          if (status === WorkflowRunStatusDtoEnum.COMPLETED) {
            return [WorkflowRunStatusEnum.SUCCESS, WorkflowRunStatusEnum.COMPLETED];
          }
          if (status === WorkflowRunStatusDtoEnum.ERROR) {
            return [WorkflowRunStatusEnum.ERROR];
          }
          return status;
        });

        queryBuilder.whereIn('status', mappedStatuses.flat());
      }

      if (channels?.length) {
        queryBuilder.orWhere(
          channels.map((channel) => ({
            field: 'channels',
            operator: 'LIKE',
            value: `%"${channel}"%`,
          }))
        );
      }

      if (topicKey) {
        queryBuilder.whereLike('topics', `%${topicKey}%`);
      }

      const safeWhere = queryBuilder.build();

      const result = await this.workflowRunRepository.count({
        where: safeWhere,
        useFinal: true,
      });

      return { count: result };
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to get workflow runs count for chart'
      );
      throw error;
    }
  }
}
