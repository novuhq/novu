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
import { NotificationRepository, SubscriberRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { WorkflowRunsCountDataPointDto } from '../../dtos/get-charts.response.dto';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';
import { BuildWorkflowRunsCountChartCommand } from './build-workflow-runs-count-chart.command';

type NotificationWorkflowStatus = 'processing' | 'completed' | 'error';

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

type NotificationCountQuery = {
  _environmentId: string;
  createdAt: { $gte: string; $lte: string };
  transactionId?: { $in: string[] };
  _templateId?: { $in: string[] };
  _subscriberId?: { $in: string[] };
  channels?: { $in: string[] };
  'topics.topicKey'?: string;
  $and?: Array<{ $or: Array<Record<string, unknown>> }>;
};

/*
 * Same filter shape as NotificationRepository.getFeed, so a filtered chart count matches the activity list.
 */
function buildNotificationCountQuery(input: {
  environmentId: string;
  startDate: Date;
  endDate: Date;
  workflowIds?: string[];
  subscriberIds?: string[];
  transactionIds?: string[];
  statuses?: NotificationWorkflowStatus[];
  channels?: string[];
  topicKey?: string;
}): NotificationCountQuery {
  const query: NotificationCountQuery = {
    _environmentId: input.environmentId,
    createdAt: {
      $gte: input.startDate.toISOString(),
      $lte: input.endDate.toISOString(),
    },
  };

  if (input.transactionIds?.length) {
    query.transactionId = { $in: input.transactionIds };
  }

  if (input.workflowIds?.length) {
    query._templateId = { $in: input.workflowIds };
  }

  if (input.subscriberIds?.length) {
    query._subscriberId = { $in: input.subscriberIds };
  }

  if (input.channels?.length) {
    query.channels = { $in: input.channels };
  }

  if (input.topicKey) {
    query['topics.topicKey'] = input.topicKey;
  }

  if (input.statuses?.length) {
    query.$and = [{ $or: workflowStatusConditions(input.statuses) }];
  }

  return query;
}

/*
 * Notifications only record the first terminal workflow status. Processing means no terminal
 * status has been recorded yet.
 */
function workflowStatusConditions(statuses: NotificationWorkflowStatus[]): Array<Record<string, unknown>> {
  const terminalEvents: string[] = [];
  let includesProcessing = false;

  for (const status of statuses) {
    switch (status) {
      case 'completed':
        terminalEvents.push('workflow_run_status_completed');
        break;
      case 'error':
        terminalEvents.push('workflow_run_status_error');
        break;
      case 'processing':
        includesProcessing = true;
        break;
      default: {
        const unhandled: never = status;
        throw new Error(`Unhandled workflow status: ${unhandled}`);
      }
    }
  }

  const conditions: Array<Record<string, unknown>> = [];

  if (includesProcessing) {
    conditions.push({ lastEmittedWorkflowStatusEvent: { $exists: false } }, { lastEmittedWorkflowStatusEvent: null });
  }

  if (terminalEvents.length > 0) {
    conditions.push({ lastEmittedWorkflowStatusEvent: { $in: terminalEvents } });
  }

  return conditions;
}

function mapWorkflowStatuses(statuses?: WorkflowRunStatusDtoEnum[]): NotificationWorkflowStatus[] | undefined {
  if (!statuses?.length) {
    return undefined;
  }

  return statuses.map((status) => {
    switch (status) {
      case WorkflowRunStatusDtoEnum.PROCESSING:
        return 'processing';
      case WorkflowRunStatusDtoEnum.COMPLETED:
        return 'completed';
      case WorkflowRunStatusDtoEnum.ERROR:
        return 'error';
      default: {
        const unhandled: never = status;

        return unhandled;
      }
    }
  });
}

@Injectable()
export class BuildWorkflowRunsCountChart {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private workflowRunCountRepository: WorkflowRunCountRepository,
    private notificationRepository: NotificationRepository,
    private subscriberRepository: SubscriberRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(BuildWorkflowRunsCountChart.name);
  }

  @InstrumentUsecase()
  async execute(command: BuildWorkflowRunsCountChartCommand): Promise<WorkflowRunsCountDataPointDto> {
    const { environmentId, organizationId, startDate, endDate } = command;

    /*
     * workflow_run_count is only bucketed by environment, organization and date, so a filtered count has to
     * come from somewhere that stores the filter dimensions. Notifications is that store: one document per
     * workflow run, indexed by transaction id, and the same collection the activity list reads.
     */
    if (hasGranularFilters(command)) {
      return this.buildCountFromNotifications(command);
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

  private async buildCountFromNotifications(
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
      let resolvedSubscriberIds: string[] | undefined;

      if (subscriberIds?.length) {
        resolvedSubscriberIds = await this.subscriberRepository.searchSubscribers(environmentId, subscriberIds);

        if (resolvedSubscriberIds.length === 0) {
          return { count: 0 };
        }
      }

      const count = await this.notificationRepository.count(
        buildNotificationCountQuery({
          environmentId,
          startDate,
          endDate,
          workflowIds,
          subscriberIds: resolvedSubscriberIds,
          transactionIds,
          statuses: mapWorkflowStatuses(statuses),
          channels,
          topicKey,
        }),
        undefined,
        'secondaryPreferred'
      );

      return { count };
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to count workflow runs from notifications'
      );
      throw error;
    }
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
