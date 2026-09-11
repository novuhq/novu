import {
  ClickhouseOperator,
  FieldCondition,
  LogRepository,
  QueryBuilder,
  WorkflowRun,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { TopicSubscribersRepository } from '@novu/dal';
import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';

export interface WorkflowRunFilterFields {
  environmentId: string;
  workflowIds?: string[];
  subscriberIds?: string[];
  transactionIds?: string[];
  statuses?: WorkflowRunStatusDtoEnum[];
  channels?: string[];
  topicKey?: string;
  subscriptionId?: string;
  createdGte?: string;
  createdLte?: string;
  severity?: SeverityLevelEnum[];
  contextKeys?: string[];
  deliveryLifecycleStatus?: DeliveryLifecycleStatusEnum[];
  deliveryLifecycleDetail?: DeliveryLifecycleDetail[];
}

function mapStatusesToStoredValues(statuses: WorkflowRunStatusDtoEnum[]): string[] {
  return statuses.flatMap((status) => {
    if (status === WorkflowRunStatusDtoEnum.PROCESSING) {
      return [WorkflowRunStatusEnum.PENDING, WorkflowRunStatusEnum.PROCESSING];
    }
    if (status === WorkflowRunStatusDtoEnum.COMPLETED) {
      return [WorkflowRunStatusEnum.SUCCESS, WorkflowRunStatusEnum.COMPLETED];
    }
    if (status === WorkflowRunStatusDtoEnum.ERROR) {
      return [WorkflowRunStatusEnum.ERROR];
    }

    const _exhaustive: never = status;

    return [_exhaustive];
  });
}

export async function applyWorkflowRunFilters(
  queryBuilder: QueryBuilder<WorkflowRun>,
  command: WorkflowRunFilterFields,
  topicSubscribersRepository: TopicSubscribersRepository
): Promise<void> {
  if (command.workflowIds?.length) {
    queryBuilder.whereIn('workflow_id', command.workflowIds);
  }

  if (command.subscriberIds?.length) {
    queryBuilder.whereIn('external_subscriber_id', command.subscriberIds);
  }

  if (command.transactionIds?.length) {
    queryBuilder.whereIn('transaction_id', command.transactionIds);
  }

  if (command.statuses?.length) {
    queryBuilder.whereIn('status', mapStatusesToStoredValues(command.statuses) as WorkflowRunStatusEnum[]);
  }

  if (command.createdGte) {
    queryBuilder.whereGreaterThanOrEqual('created_at', LogRepository.formatDateTime64(new Date(command.createdGte)));
  }

  if (command.createdLte) {
    queryBuilder.whereLessThanOrEqual('created_at', LogRepository.formatDateTime64(new Date(command.createdLte)));
  }

  if (command.channels?.length) {
    queryBuilder.orWhere(
      command.channels.map((channel) => ({
        field: 'channels',
        operator: 'LIKE',
        value: `%"${channel}"%`,
      }))
    );
  }

  const severity = command.severity ?? [];
  if (severity.length) {
    const orConditions: Array<FieldCondition<WorkflowRun, keyof WorkflowRun, ClickhouseOperator>> = [];
    if (severity.includes(SeverityLevelEnum.NONE)) {
      orConditions.push({
        field: 'severity',
        operator: 'IS NULL',
      });
      orConditions.push({
        field: 'severity',
        operator: '=',
        value: SeverityLevelEnum.NONE,
      });
    }
    const severityWithoutNone = severity.filter((level) => level !== SeverityLevelEnum.NONE);
    for (const level of severityWithoutNone) {
      orConditions.push({
        field: 'severity',
        operator: '=',
        value: level.toString(),
      });
    }
    queryBuilder.orWhere(orConditions);
  }

  if (command.topicKey) {
    queryBuilder.whereLike('topics', `%${command.topicKey}%`);
  }

  if (command.subscriptionId) {
    const subscription = await topicSubscribersRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.subscriptionId,
    });

    if (subscription) {
      queryBuilder.whereLike('topics', `%${subscription.topicKey}%`);
      queryBuilder.whereLike('topics', `%${subscription.identifier}%`);
      queryBuilder.whereEquals('external_subscriber_id', subscription.externalSubscriberId);
    }
  }

  if (command.contextKeys !== undefined) {
    if (command.contextKeys.length === 0) {
      queryBuilder.whereEquals('context_keys', []);
    } else {
      queryBuilder.whereHasAll('context_keys', command.contextKeys);
    }
  }

  if (command.deliveryLifecycleStatus?.length) {
    queryBuilder.whereIn('delivery_lifecycle_status', command.deliveryLifecycleStatus);
  }

  if (command.deliveryLifecycleDetail?.length) {
    queryBuilder.whereIn('delivery_lifecycle_detail', command.deliveryLifecycleDetail);
  }
}
