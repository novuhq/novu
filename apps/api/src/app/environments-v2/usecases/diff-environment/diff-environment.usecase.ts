import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { EnvironmentRepository, BaseRepository } from '@novu/dal';
import { DiffEnvironmentCommand } from './diff-environment.command';
import { EntityTypeEnum, ISyncStrategy, IEnvironmentDiffResult } from '../../types/sync.types';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class DiffEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: DiffEnvironmentCommand): Promise<IEnvironmentDiffResult> {
    try {
      await this.validateEnvironments(command);

      this.logger.info(
        `Starting environment diff between ${command.sourceEnvironmentId} and ${command.targetEnvironmentId}`
      );

      // For now, we only support workflow diff
      // In the future, we can add more strategies here
      const strategies = [this.workflowSyncStrategy];

      const results = await this.executeDiff(
        strategies,
        command.sourceEnvironmentId,
        command.targetEnvironmentId,
        command.user.organizationId
      );

      const summary = this.calculateSummary(results);

      this.logger.info(
        `Environment diff completed. Total entities: ${summary.totalEntities}, ` +
          `Total changes: ${summary.totalChanges}, Has changes: ${summary.hasChanges}`
      );

      return {
        sourceEnvironmentId: command.sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        results,
        summary,
      };
    } catch (error) {
      this.logger.error(`Environment diff failed: ${error.message}`);
      throw error;
    }
  }

  private async validateEnvironments(command: DiffEnvironmentCommand): Promise<void> {
    if (command.sourceEnvironmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Source and target environments cannot be the same');
    }

    // Validate ObjectId format
    if (
      !BaseRepository.isInternalId(command.sourceEnvironmentId) ||
      !BaseRepository.isInternalId(command.targetEnvironmentId)
    ) {
      throw new BadRequestException('Invalid environment ID format');
    }

    const [sourceEnv, targetEnv] = await Promise.all([
      this.environmentRepository.findOne({
        _id: command.sourceEnvironmentId,
        _organizationId: command.user.organizationId,
      }),
      this.environmentRepository.findOne({
        _id: command.targetEnvironmentId,
        _organizationId: command.user.organizationId,
      }),
    ]);

    if (!sourceEnv) {
      throw new BadRequestException('Source environment not found');
    }

    if (!targetEnv) {
      throw new BadRequestException('Target environment not found');
    }
  }

  private async executeDiff(
    strategies: ISyncStrategy[],
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string
  ) {
    const results: any[] = [];

    for (const strategy of strategies) {
      const result = await strategy.diff(sourceEnvId, targetEnvId, organizationId);
      results.push(result);
    }

    return results;
  }

  private calculateSummary(results: any[]) {
    const summary = {
      totalEntities: 0,
      totalChanges: 0,
      hasChanges: false,
    };

    for (const result of results) {
      summary.totalEntities += result.diffs.length;
      summary.totalChanges += result.summary.added + result.summary.modified + result.summary.deleted;
    }

    summary.hasChanges = summary.totalChanges > 0;

    return summary;
  }
}
