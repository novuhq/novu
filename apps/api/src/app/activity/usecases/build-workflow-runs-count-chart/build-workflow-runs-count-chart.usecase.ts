import { Injectable } from '@nestjs/common';
import {
  InstrumentUsecase,
  PinoLogger,
  QueryBuilder,
  WorkflowRun,
  WorkflowRunRepository,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { WorkflowRunsCountDataPointDto } from '../../dtos/get-charts.response.dto';
import { BuildWorkflowRunsCountChartCommand } from './build-workflow-runs-count-chart.command';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';
 
@Injectable()
export class BuildWorkflowRunsCountChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsCountChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsCountChartCommand): Promise<WorkflowRunsCountDataPointDto> {
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

    this.logger.debug('Getting workflow runs count for chart', {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    try {
      const queryBuilder = new QueryBuilder<WorkflowRun>({
        environmentId,
      });

      // Add date range filters
      queryBuilder.whereGreaterThanOrEqual('created_at', startDate);
      queryBuilder.whereLessThanOrEqual('created_at', endDate);

      // Add optional filters
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
        const mappedStatuses = statuses.map((status) => { //backward compatibility: if new statuses are used, append old status until renewed in the database, nv-6562
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

      return {
        count: result,
      };
    } catch (error) {
      this.logger.error('Failed to get workflow runs count for chart', {
        error: error.message,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });
      throw error;
    }
  }
}
