import { Injectable } from '@nestjs/common';
import { PinoLogger, QueryBuilder, WorkflowRun, WorkflowRunRepository } from '@novu/application-generic';
import { TopicSubscribersRepository } from '@novu/dal';
import { GetWorkflowRunStatsResponseDto } from '../../dtos/workflow-run-stats.dto';
import { ActivityRetentionService } from '../../shared/activity-retention.service';
import { applyWorkflowRunFilters } from '../../shared/build-workflow-run-where';
import { GetWorkflowRunStatsCommand } from './get-workflow-run-stats.command';

const BUCKET_LIMIT = 50;

@Injectable()
export class GetWorkflowRunStats {
  constructor(
    private workflowRunRepository: WorkflowRunRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private activityRetentionService: ActivityRetentionService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(GetWorkflowRunStats.name);
  }

  async execute(command: GetWorkflowRunStatsCommand): Promise<GetWorkflowRunStatsResponseDto> {
    const retentionWindow = await this.activityRetentionService.validateRetentionLimitForTier(
      command.organizationId,
      command.createdGte,
      command.createdLte
    );
    const queryWindow = this.activityRetentionService.queryWindowForWorkflowRuns(retentionWindow, command.createdLte);

    const queryBuilder = new QueryBuilder<WorkflowRun>({
      environmentId: command.environmentId,
    });

    await applyWorkflowRunFilters(
      queryBuilder,
      {
        ...command,
        createdGte: queryWindow.after,
        createdLte: queryWindow.before,
      },
      this.topicSubscribersRepository
    );

    const result = await this.workflowRunRepository.getGroupedStats({
      where: queryBuilder.build(),
      groupBy: command.groupBy,
      bucketLimit: BUCKET_LIMIT,
    });

    return {
      total: result.total,
      uniqueSubscribers: result.uniqueSubscribers,
      groupBy: command.groupBy ?? null,
      buckets: result.buckets,
    };
  }
}
