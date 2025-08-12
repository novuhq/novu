import { Injectable } from '@nestjs/common';
import { PinoLogger, QueryBuilder, WorkflowRun, WorkflowRunRepository } from '@novu/application-generic';
import { GetWorkflowRunsCountCommand } from './get-workflow-runs-count.command';

@Injectable()
export class GetWorkflowRunsCount {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetWorkflowRunsCountCommand): Promise<number> {
    this.logger.debug('Getting workflow runs count', {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    try {
      const queryBuilder = new QueryBuilder<WorkflowRun>({
        environmentId: command.environmentId,
      });

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
        queryBuilder.whereIn('status', command.statuses);
      }

      if (command.createdGte) {
        queryBuilder.whereGreaterThanOrEqual('created_at', new Date(command.createdGte));
      }

      if (command.createdLte) {
        queryBuilder.whereLessThanOrEqual('created_at', new Date(command.createdLte));
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

      if (command.topicKey) {
        queryBuilder.whereLike('topics', `%${command.topicKey}%`);
      }

      const safeWhere = queryBuilder.build();

      const result = await this.workflowRunRepository.count({
        where: safeWhere,
        useFinal: true,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to get workflow runs count', {
        error: error.message,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });
      throw error;
    }
  }
}
